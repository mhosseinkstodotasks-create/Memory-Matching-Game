// Global state for images
var allImages = [];
var defaultImages = [
    "image1.jpg",
    "image2.jpg",
    "image3.jpg",
    "image4.jpg",
    "image5.jpg",
    "image6.jpg",
    "image7.jpg",
    "image8.jpg",
    "image9.jpg",
    "image10.jpg"
];
var pre = "", pID, ppID = 0, turn = 0, t = "transform", flip = "rotateY(180deg)", flipBack = "rotateY(0deg)", time, mode;

var RECORDS_KEY = "raman_memory_game_top_records";

// Convert numbers/digits to Persian digits
function toPersianDigits(num) {
    var persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return String(num).replace(/\d/g, function(w) {
        return persianDigits[parseInt(w, 10)];
    });
}

// Format seconds to mm:ss with Persian digits
function formatTime(sec) {
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    var mStr = m < 10 ? "0" + m : "" + m;
    var sStr = s < 10 ? "0" + s : "" + s;
    return toPersianDigits(mStr + ":" + sStr);
}

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

// Handle "بازگشت" button click using centralized CONFIG
function goBack() {
    var url = (typeof CONFIG !== 'undefined' && CONFIG.backUrl) ? CONFIG.backUrl : "";
    if (url) {
        window.location.href = url;
    } else {
        alert("لینک بازگشت در دسترس نیست.");
    }
}

// Top 5 Records Management
function getTopRecords() {
    try {
        var data = localStorage.getItem(RECORDS_KEY);
        if (!data) return [];
        var parsed = JSON.parse(data);
        if (!Array.isArray(parsed)) return [];
        var validRecords = parsed.filter(function(item) {
            return typeof item === 'object' && item !== null && typeof item.time === 'number' && typeof item.moves === 'number';
        });
        return validRecords;
    } catch (e) {
        console.warn("Corrupted records in localStorage, resetting.", e);
        try {
            localStorage.removeItem(RECORDS_KEY);
        } catch (err) {}
        return [];
    }
}

function saveTopRecord(completionTime, movesCount) {
    var records = getTopRecords();
    records.push({ time: completionTime, moves: movesCount });
    records.sort(function(a, b) {
        if (a.time !== b.time) {
            return a.time - b.time;
        }
        return a.moves - b.moves;
    });
    records = records.slice(0, 5);
    try {
        localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
    } catch (e) {
        console.error("Failed to save records to localStorage", e);
    }
    renderTopRecords();
}

function renderTopRecords() {
    var records = getTopRecords();
    var $list = $("#records-list");
    if (!$list.length) return;

    if (records.length === 0) {
        $list.html('<div class="no-records">هنوز رکوردی ثبت نشده است</div>');
        return;
    }

    var html = "<div class='records-items'>";
    records.forEach(function(rec, index) {
        var rankP = toPersianDigits(index + 1);
        var timeP = toPersianDigits(rec.time);
        var movesP = toPersianDigits(rec.moves);
        html += `<div class="record-row"><span class="rank" style="display:inline-block; direction:ltr;">${rankP}.</span> <span class="time-val">${timeP} ثانیه</span> — <span class="moves-val">${movesP} حرکت</span></div>`;
    });
    html += "</div>";
    $list.html(html);
}

// Load manifest on page load and start 4x5 game directly
window.onload = function() {
    init();
    renderTopRecords();
    fetch('pictures/images.json')
        .then(function(response) {
            if (!response.ok) {
                throw new Error("HTTP error " + response.status);
            }
            return response.json();
        })
        .then(function(data) {
            if (Array.isArray(data) && data.length >= 10) {
                allImages = data;
            } else {
                console.warn("Invalid or insufficient images in images.json, using default image list fallback.");
                allImages = defaultImages;
            }
            start(4, 5);
        })
        .catch(function(err) {
            console.warn("Could not fetch pictures/images.json (e.g. file:// protocol restriction). Using default fallback images.", err);
            if (Array.isArray(defaultImages) && defaultImages.length >= 10) {
                allImages = defaultImages;
                start(4, 5);
            } else {
                $("#ol").html(`<center><div id="inst"><h3>Error</h3><p style="font-size:18px;">Could not load card images manifest or fallback list.</p></div></center>`);
                $("#ol").show();
            }
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

    var maxTime = (typeof CONFIG !== 'undefined' && typeof CONFIG.gameTime === 'number' && CONFIG.gameTime > 0) ? CONFIG.gameTime : 30;
    var remainingTime = maxTime;
    var moves = 0;

    $("#time").html("زمان: " + formatTime(remainingTime));
    $("#moves").html("حرکت: " + toPersianDigits(moves));

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
        // Start countdown timer
        time = setInterval(function() {
            remainingTime--;
            if (remainingTime <= 0) {
                remainingTime = 0;
                $("#time").html("زمان: " + formatTime(remainingTime));
                clearInterval(time);
                turn = 2; // Block board interactions

                setTimeout(function() {
                    $("#ol").html(`
                        <center>
                            <div id="iol">
                                <h2>متاسفانه باختید. دوست دارید دوباره تلاش کنید؟</h2>
                                <div style="margin-top: 25px;">
                                    <button onclick="start(4, 5)">تلاش دوباره</button>
                                    <button onclick="goBack()">بازگشت</button>
                                </div>
                            </div>
                        </center>
                    `);
                    $("#ol").fadeIn(750);
                }, 300);
            } else {
                $("#time").html("زمان: " + formatTime(remainingTime));
            }
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
                    $("#moves").html("حرکت: " + toPersianDigits(moves));
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
                var completionTime = maxTime - remainingTime;
                saveTopRecord(completionTime, moves);

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
