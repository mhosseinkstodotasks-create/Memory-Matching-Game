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

// Generate level buttons HTML based on available images
function getButtonsHtml(availableCount) {
    var levels = [
        { r: 3, l: 4 },
        { r: 4, l: 4 },
        { r: 4, l: 5 },
        { r: 5, l: 6 },
        { r: 6, l: 6 }
    ];
    return levels.map(function(lvl) {
        var req = (lvl.r * lvl.l) / 2;
        var isDisabled = availableCount < req;
        var titleText = isDisabled ? "Requires " + req + " images (only " + availableCount + " available)" : lvl.r + " x " + lvl.l;
        var disabledAttr = isDisabled ? 'disabled class="disabled-btn"' : '';
        return `<button ${disabledAttr} title="${titleText}" onclick="start(${lvl.r}, ${lvl.l})">${lvl.r} x ${lvl.l}</button>`;
    }).join(" ");
}

// Helper to show welcome overlay
function showWelcomeOverlay() {
    var btnHtml = getButtonsHtml(allImages.length);
    var statusMsg = "";
    if (allImages.length === 0) {
        statusMsg = `<p style="color: #ffdddd; font-size:16px;">Loading images manifest...</p>`;
    }
    $("#ol").html(`<center><div id="inst"><h3>Welcome !</h3>Instructions For Game<br/><br/><li>Make pairs of similiar blocks by flipping them.</li><li>To flip a block you can click on it.</li><li>If two blocks you clicked are not similar, they will be flipped back.</li><p style="font-size:18px;">Click one of the following mode to start the game.</p>${statusMsg}</div>${btnHtml}</center>`);
    $("#ol").show();
}

// Load manifest on page load
window.onload = function() {
    init();
    showWelcomeOverlay();
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
            showWelcomeOverlay();
        })
        .catch(function(err) {
            console.error("Error loading pictures/images.json:", err);
            $("#ol").html(`<center><div id="inst"><h3>Error</h3><p style="font-size:18px;">Could not load pictures/images.json manifest.<br/>Please ensure pictures/images.json exists.</p></div></center>`);
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

        // Hiding instructions screen
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
                var timeText = (min == 0) ? `${sec} seconds` : `${min} minute(s) and ${sec} second(s)`;
                var playAgainBtns = getButtonsHtml(allImages.length);

                setTimeout(function() {
                    $("#ol").html(`<center><div id="iol"><h2>Congrats!</h2><p style="font-size:23px;padding:10px;">You completed the ${mode} mode in ${moves} moves. It took you ${timeText}.</p><p style="font-size:18px">Comment Your Score!<br/>Play Again ?</p>${playAgainBtns}</div></center>`);
                    $("#ol").fadeIn(750);
                }, 1500);
            }
        };
    });
}
