// Global state for images
var allImages = [];
var pre = "", pID, ppID = 0, turn = 0, t = "transform", flip = "rotateY(180deg)", flipBack = "rotateY(0deg)", time, mode;

// Resizing Screen
window.onresize = init;
function init() {
    var W = innerWidth;
    var H = innerHeight;
    $('body').height(H + "px");
    $('#ol').height(H + "px");
}

// Utility to escape HTML attributes safely
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// Handle "بازگشت" button click
function goBack() {
    fetch('back.txt')
        .then(function(response) {
            if (!response.ok) {
                throw new Error("Failed to load back.txt");
            }
            return response.text();
        })
        .then(function(text) {
            var url = text.trim();
            if (url) {
                window.location.href = url;
            } else {
                alert("لینک بازگشت در دسترس نیست.");
            }
        })
        .catch(function(err) {
            console.error("Error loading back.txt:", err);
            alert("لینک بازگشت در دسترس نیست.");
        });
}

// Load manifest on page load and start 4x5 game directly
window.onload = function() {
    init();
    fetch('pictures/images.json')
        .then(function(response) {
            if (!response.ok) {
                throw new Error("HTTP error " + response.status);
            }
            return response.json();
        })
        .then(function(data) {
            if (Array.isArray(data)) {
                allImages = data;
            } else {
                console.error("Invalid images.json format, expected array.");
            }
            start(4, 5);
        })
        .catch(function(err) {
            console.error("Error loading pictures/images.json:", err);
            $("#ol").html(`<center><div id="inst"><h3>Error</h3><p style="font-size:18px;">Could not load pictures/images.json manifest.<br/>Please ensure pictures/images.json exists.</p></div></center>`);
            $("#ol").show();
        });
};

// Preload specific images
function preloadImages(imageFiles) {
    return Promise.all(imageFiles.map(function(file) {
        return new Promise(function(resolve) {
            var img = new Image();
            img.onload = resolve;
            img.onerror = resolve; // resolve anyway so game setup proceeds
            img.src = "pictures/" + encodeURI(file);
        });
    }));
}

// Starting the game
function start(r, l) {
    r = r || 4;
    l = l || 5;
    var noItems = (r * l) / 2;
    if (allImages.length < noItems) {
        alert("Not enough images for this level. Required: " + noItems + ", Available: " + allImages.length + ". Please add more images to the pictures folder.");
        return;
    }

    // Reset game variables & state
    if (time) clearInterval(time);
    turn = 0;
    pre = "";
    ppID = 0;
    pID = null;

    var min = 0, sec = 0, moves = 0;
    $("#time").html("Time: 00:00");
    $("#moves").html("Moves: 0");

    var rem = noItems;
    mode = r + "x" + l;

    // Pick 'noItems' unique images randomly
    var shuffledManifest = allImages.slice();
    var p = shuffledManifest.length;
    while (--p > 0) {
        var c = Math.floor(Math.random() * (p + 1));
        var tmp = shuffledManifest[c];
        shuffledManifest[c] = shuffledManifest[p];
        shuffledManifest[p] = tmp;
    }
    var selectedImages = shuffledManifest.slice(0, noItems);

    // Preload selected images before starting timer and rendering table
    preloadImages(selectedImages).then(function() {
        time = setInterval(function() {
            sec++;
            if (sec == 60) {
                min++;
                sec = 0;
            }
            if (sec < 10)
                $("#time").html("Time: 0" + min + ":0" + sec);
            else
                $("#time").html("Time: 0" + min + ":" + sec);
        }, 1000);

        // Duplicate each image twice and shuffle
        var items = [];
        for (var i = 0; i < noItems; i++) items.push(selectedImages[i]);
        for (var i = 0; i < noItems; i++) items.push(selectedImages[i]);

        p = items.length;
        while (--p > 0) {
            c = Math.floor(Math.random() * (p + 1));
            tmp = items[c];
            items[c] = items[p];
            items[p] = tmp;
        }

        // Set layout variables on document root or table for dynamic responsive sizing
        document.documentElement.style.setProperty('--game-rows', r);
        document.documentElement.style.setProperty('--game-cols', l);

        // Creating table
        $("table").html("");
        var n = 1;
        var fallbackSvg = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='%23ccc'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23666' font-size='12'>Image Error</text></svg>";

        for (var i = 1; i <= r; i++) {
            var rowHtml = "<tr>";
            for (var j = 1; j <= l; j++) {
                var imgPath = items[n - 1];
                var cardId = escapeHtml(imgPath);
                rowHtml += `<td id='${n}' onclick="change(${n})">
                    <div class='inner' data-card-id="${cardId}">
                        <div class='front'></div>
                        <div class='back'>
                            <img src="pictures/${encodeURI(imgPath)}" alt="" data-card-id="${cardId}" onerror="this.onerror=null; this.src='${fallbackSvg}';">
                        </div>
                    </div>
                </td>`;
                n++;
            }
            rowHtml += "</tr>";
            $("table").append(rowHtml);
        }

        // Hiding instructions screen / overlay
        $("#ol").fadeOut(500);

        // Internal flip handler
        window.change = function(x) {
            let i = "#" + x + " .inner";
            let b = "#" + x + " .inner .back";

            // Dont flip if already turning 2 cards, card locked, or same card clicked
            if (turn == 2 || $(i).attr("flip") == "block" || ppID == x) {
                return;
            }

            // Flip card
            $(i).css(t, flip);
            var cardId = $(i).attr("data-card-id");

            if (turn == 1) {
                turn = 2;

                // If cards do not match
                if (pre !== cardId) {
                    setTimeout(function() {
                        $(pID).css(t, flipBack);
                        $(i).css(t, flipBack);
                        ppID = 0;
                    }, 1000);
                } else {
                    // Cards match
                    rem--;
                    $(i).attr("flip", "block");
                    $(pID).attr("flip", "block");
                }

                setTimeout(function() {
                    turn = 0;
                    moves++;
                    $("#moves").html("Moves: " + moves);
                }, 1150);
            } else {
                pre = cardId;
                ppID = x;
                pID = "#" + x + " .inner";
                turn = 1;
            }

            // Game completion check
            if (rem == 0) {
                clearInterval(time);

                setTimeout(function() {
                    $("#ol").html(`
                        <center>
                            <div id="iol">
                                <h2>ممنون از شما موفق باشید</h2>
                                <div style="margin-top: 25px;">
                                    <button onclick="start(4, 5)">بازی مجدد</button>
                                    <button onclick="goBack()">بازگشت</button>
                                </div>
                            </div>
                        </center>
                    `);
                    $("#ol").fadeIn(750);
                }, 1500);
            }
        };
    });
}
