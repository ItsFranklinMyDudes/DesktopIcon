const iconContainer = document.getElementById("icon-container");
const searchBar = document.getElementById("search-bar");
const confirmButton = document.getElementById("download-selection");
const colorPicker = document.getElementById("color-picker"); // Hidden original color picker
const colorOptions = document.querySelectorAll(".color-option");

// Gradient picker elements
const colorGradient = document.getElementById("color-gradient");
const colorSlider = document.getElementById("color-slider");
const colorPreview = document.getElementById("color-preview");
const rInput = document.getElementById("r-value");
const gInput = document.getElementById("g-value");
const bInput = document.getElementById("b-value");
const colorCursor = document.querySelector(".color-cursor");
const hueCursor = document.querySelector(".hue-cursor");
const hexInput = document.getElementById("hex-value");
const hexInputContainer = document.querySelector('.hex-input-container');

let hexInputActive = false;

let selectedIcons = [];
let currentColor = "#FF0000"; // Default red
let currentHue = 0; // Default hue (red)
let pickerPos = { x: 0, y: 0 }; // Position in the color gradient

// Set up the gradient picker
let isPickingColor = false;
let isAdjustingHue = false;

// Pagination variables
let currentPage = 1;
let iconsPerPage = 75;
let totalIcons = 0;
let allIcons = [];

// Initialize the color picker with default red
initColorPicker();

// Color gradient interactions
colorGradient.addEventListener("mousedown", startPickingColor);
document.addEventListener("mousemove", pickColor);
document.addEventListener("mouseup", stopPickingColor);

// Hue slider interactions
colorSlider.addEventListener("mousedown", startAdjustingHue);
document.addEventListener("mousemove", adjustHue);
document.addEventListener("mouseup", stopAdjustingHue);

// RGB input interactions
rInput.addEventListener("input", updateFromRgb);
gInput.addEventListener("input", updateFromRgb);
bInput.addEventListener("input", updateFromRgb);

function initColorPicker() {
    // Set initial hue and picker position
    updateColorGradient(currentHue);

    // Set initial cursor positions
    const huePercent = currentHue / 360;
    hueCursor.style.left = `${huePercent * 100}%`;

    // For red (255,0,0) - position would be at bottom right
    colorCursor.style.left = `100%`;
    colorCursor.style.top = `0%`;

    // Set initial color
    updateColorFromHsv(currentHue, 1, 1);

    // Set initial hex value (new code)
    hexInput.value = currentColor.substring(1);

    const originalInitColorPicker = initColorPicker;
    initColorPicker = function () {
        originalInitColorPicker();
        reorganizeColorPicker();
    };
}

hexInputContainer.addEventListener('click', function (e) {
    // If we didn't click directly on the input, focus it
    if (e.target !== hexInput) {
        hexInput.focus();
    }

    // First click - just select all
    if (!hexInputActive) {
        hexInput.select();
        hexInputActive = true;
    }
});

function startPickingColor(e) {
    isPickingColor = true;
    pickColor(e);
}

function pickColor(e) {
    if (!isPickingColor) return;

    const rect = colorGradient.getBoundingClientRect();
    let x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    let y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    // Save picker position
    pickerPos = { x, y };

    // Update cursor position
    colorCursor.style.left = `${x * 100}%`;
    colorCursor.style.top = `${y * 100}%`;

    // x = saturation (0 at left, 1 at right)
    // y = value/brightness (1 at top, 0 at bottom)
    const s = x;
    const v = 1 - y;

    updateColorFromHsv(currentHue, s, v);
}

function updateColorCursors(h, s, v) {
    // Keep hue between 0-359
    h = h % 360;
    if (h < 0) h += 360;
    if (h === 360) h = 359;

    // Calculate position percentage while preventing 100% exactly
    const huePosition = Math.min((h / 360), 0.9999);

    // Update hue slider position
    hueCursor.style.left = `${huePosition * 100}%`;

    // Update color picker position
    colorCursor.style.left = `${s * 100}%`;
    colorCursor.style.top = `${(1 - v) * 100}%`;

    // Save the picker position
    pickerPos = { x: s, y: (1 - v) };
}

function componentToHex(c) {
    const hex = Math.max(0, Math.min(255, Math.round(c))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
}

function stopPickingColor() {
    isPickingColor = false;
}

function startAdjustingHue(e) {
    isAdjustingHue = true;
    adjustHue(e);
}

function adjustHue(e) {
    if (!isAdjustingHue) return;

    const rect = colorSlider.getBoundingClientRect();
    // Get the position within the slider
    const position = e.clientX - rect.left;
    // Calculate percentage (0 to 1)
    let percentage = position / rect.width;

    // Ensure the cursor stays at the edges
    percentage = Math.max(0, Math.min(1, percentage));

    // Set the hue (0-359.99)
    // Avoid using 360 exactly to prevent wrap-around issues
    currentHue = percentage < 1 ? Math.round(percentage * 360) : 359;

    // Update slider cursor position - keep it where the mouse actually is
    hueCursor.style.left = `${percentage * 100}%`;

    // Update the gradient with the new hue
    updateColorGradient(currentHue);

    // Update color using current picker position
    updateColorFromHsv(currentHue, pickerPos.x, 1 - pickerPos.y);
}

function stopAdjustingHue() {
    isAdjustingHue = false;
}

function updateColorGradient(hue) {
    // Ensure the gradient works with any hue value
    const normalizedHue = hue % 360;

    // Create the base hue color for the gradient
    const hueColor = hslToRgb(normalizedHue / 360, 1, 0.5);
    const hueRgb = `rgb(${hueColor.r}, ${hueColor.g}, ${hueColor.b})`;

    // Create the gradient overlay
    colorGradient.style.background = `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hueRgb})`;
    colorGradient.style.backgroundBlendMode = "normal";
}

function updateFromRgb() {
    const r = parseInt(rInput.value) || 0;
    const g = parseInt(gInput.value) || 0;
    const b = parseInt(bInput.value) || 0;

    updateColorFromRgb(r, g, b);
}

function updateColorFromHsv(h, s, v) {
    // Keep hue between 0-359 (not 360, to prevent wrap-around)
    h = h % 360;
    if (h < 0) h += 360;
    if (h === 360) h = 359; // Prevent wrap-around at the boundary

    const rgb = hsvToRgb(h, s, v);
    updateColorFromRgb(rgb.r, rgb.g, rgb.b);
}

function updateColorFromRgb(r, g, b) {
    // Existing code remains...
    r = Math.max(0, Math.min(255, Math.round(r)));
    g = Math.max(0, Math.min(255, Math.round(g)));
    b = Math.max(0, Math.min(255, Math.round(b)));

    // Update RGB inputs
    rInput.value = r;
    gInput.value = g;
    bInput.value = b;

    // Convert to hex
    const hex = rgbToHex(r, g, b);
    currentColor = hex;

    // Update hex input (new code)
    hexInput.value = hex.substring(1); // Remove the # character

    // Update color preview
    colorPreview.style.backgroundColor = hex;

    // Update the hidden color picker for compatibility
    colorPicker.value = hex;

    // Remaining code stays the same...
    // Convert to HSV and update picker position if needed
    const hsv = rgbToHsv(r, g, b);

    // Update hue if color is not grayscale
    if (hsv.s > 0.05 && hsv.v > 0.05) {
        if (Math.abs(hsv.h - currentHue) > 5) {
            currentHue = hsv.h;
            updateColorGradient(currentHue);

            // Update hue slider position - avoid exact 360° position
            const huePosition = Math.min((currentHue / 360), 0.9999);
            hueCursor.style.left = `${huePosition * 100}%`;
        }

        // Update picker position if it's significantly different
        const newX = hsv.s;
        const newY = 1 - hsv.v;
        if (Math.abs(newX - pickerPos.x) > 0.02 || Math.abs(newY - pickerPos.y) > 0.02) {
            pickerPos = { x: newX, y: newY };
            colorCursor.style.left = `${newX * 100}%`;
            colorCursor.style.top = `${newY * 100}%`;
        }
    }

    // Deselect all color options
    colorOptions.forEach(option => {
        option.classList.remove("selected");
    });

    // Check if this color matches any preset
    colorOptions.forEach(option => {
        if (option.dataset.color.toLowerCase() === hex.toLowerCase()) {
            option.classList.add("selected");
        }
    });

    // Update icons
    updateIconColors(hex);
}

document.addEventListener('click', function (e) {
    if (!hexInputContainer.contains(e.target)) {
        hexInputActive = false;
    }
});

hexInput.addEventListener('focus', function () {
    if (!hexInputActive) {
        this.select();
        hexInputActive = true;
    }
});

hexInput.addEventListener("input", function () {
    // Remove any non-hex characters and the # if present
    let hexValue = this.value.replace(/[^0-9A-Fa-f]/g, "");

    // If we have a valid hex color
    if (hexValue.length === 6) {
        updateColorFromHex("#" + hexValue);
    } else if (hexValue.length === 3) {
        // Support 3-digit hex
        const r = hexValue[0];
        const g = hexValue[1];
        const b = hexValue[2];
        updateColorFromHex("#" + r + r + g + g + b + b);
    }

    // Update the input value after filtering
    this.value = hexValue;
});

// Set up color option selection
colorOptions.forEach(option => {
    option.addEventListener("click", function () {
        const color = this.dataset.color;
        const rgb = hexToRgb(color);
        updateColorFromRgb(rgb.r, rgb.g, rgb.b);
    });
});

function updateColorFromHex(hex) {
    const rgb = hexToRgb(hex);
    if (rgb) {
        // Convert to HSV to update the gradient pickers properly
        const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
        
        // Update hue first to set the proper gradient
        currentHue = hsv.h;
        updateColorGradient(currentHue);
        
        // Update the cursors BEFORE updating color from RGB
        updateColorCursors(hsv.h, hsv.s, hsv.v);
        
        // Then update color from RGB
        updateColorFromRgb(rgb.r, rgb.g, rgb.b);
    }
}



// Color conversion utilities
function rgbToHex(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

function hexToRgb(hex) {
    // Remove # if present
    hex = hex.replace(/^#/, '');

    // Handle both 3 and 6 digit hex codes
    if (hex.length === 3) {
        hex = hex.split('').map(char => char + char).join('');
    }

    if (hex.length !== 6) {
        return null;
    }

    // Parse the hex values
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    return { r, g, b };
}

function rgbToHsv(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;

    let h, s, v = max;

    s = max === 0 ? 0 : d / max;

    if (max === min) {
        h = 0; // achromatic
    } else {
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h *= 60;

        // Ensure h is within 0-360 range
        h = h % 360;
        if (h < 0) h += 360;
    }

    return { h, s, v };
}

function hsvToRgb(h, s, v) {
    let r, g, b;

    const i = Math.floor(h / 60);
    const f = h / 60 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);

    switch (i % 6) {
        case 0: r = v; g = t; b = p; break;
        case 1: r = q; g = v; b = p; break;
        case 2: r = p; g = v; b = t; break;
        case 3: r = p; g = q; b = v; break;
        case 4: r = t; g = p; b = v; break;
        case 5: r = v; g = p; b = q; break;
    }

    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255)
    };
}

function hslToRgb(h, s, l) {
    let r, g, b;

    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = function (p, q, t) {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;

        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }

    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255)
    };
}

// Fetch icons from the server
async function fetchIcons() {
    try {
        const response = await fetch("/api/icons");
        const icons = await response.json();
        return icons;
    } catch (error) {
        console.error("Failed to fetch icons:", error);
        return [];
    }
}


// Create a single reusable canvas for recoloring
const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");

// Recolor an image using the specified canvas
function recolorCanvas(canvas, img, color) {
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(img, 0, 0);

    ctx.globalCompositeOperation = "source-in";
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.globalCompositeOperation = "source-over"; // reset mode
}

function filterAndPaginateIcons(icons, filter = "", page = 1) {
    const filteredIcons = icons.filter(icon =>
        icon.name.toLowerCase().includes(filter.toLowerCase())
    );

    totalIcons = filteredIcons.length;
    const totalPages = Math.ceil(totalIcons / iconsPerPage);

    // Make sure current page is valid
    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;
    currentPage = page;

    // Get icons for the current page
    const startIndex = (page - 1) * iconsPerPage;
    const endIndex = startIndex + iconsPerPage;
    const pagedIcons = filteredIcons.slice(startIndex, endIndex);

    // Update pagination controls
    updatePaginationControls(totalPages);

    return pagedIcons;
}

// Create pagination controls function
function updatePaginationControls(totalPages) {
    const paginationContainer = document.getElementById("pagination-container");
    paginationContainer.innerHTML = "";

    // Don't show pagination if fewer than iconsPerPage
    if (totalIcons <= iconsPerPage) return;

    // Create previous button
    const prevBtn = document.createElement("button");
    prevBtn.innerHTML = "&laquo;";
    prevBtn.classList.add("pagination-btn");
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener("click", () => loadIcons(searchBar.value, currentPage - 1));
    paginationContainer.appendChild(prevBtn);

    // Calculate which page buttons to show
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);

    // Adjust if we're at the end
    if (endPage === totalPages) {
        startPage = Math.max(1, endPage - 4);
    }

    // Add first page button if not starting from page 1
    if (startPage > 1) {
        const firstBtn = document.createElement("button");
        firstBtn.textContent = "1";
        firstBtn.classList.add("pagination-btn");
        firstBtn.addEventListener("click", () => loadIcons(searchBar.value, 1));
        paginationContainer.appendChild(firstBtn);

        if (startPage > 2) {
            const ellipsis = document.createElement("span");
            ellipsis.textContent = "...";
            ellipsis.classList.add("pagination-ellipsis");
            paginationContainer.appendChild(ellipsis);
        }
    }

    // Add page buttons
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement("button");
        pageBtn.textContent = i;
        pageBtn.classList.add("pagination-btn");
        if (i === currentPage) {
            pageBtn.classList.add("active");
        }
        pageBtn.addEventListener("click", () => loadIcons(searchBar.value, i));
        paginationContainer.appendChild(pageBtn);
    }

    // Add last page button if not ending at last page
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const ellipsis = document.createElement("span");
            ellipsis.textContent = "...";
            ellipsis.classList.add("pagination-ellipsis");
            paginationContainer.appendChild(ellipsis);
        }

        const lastBtn = document.createElement("button");
        lastBtn.textContent = totalPages;
        lastBtn.classList.add("pagination-btn");
        lastBtn.addEventListener("click", () => loadIcons(searchBar.value, totalPages));
        paginationContainer.appendChild(lastBtn);
    }

    // Create next button
    const nextBtn = document.createElement("button");
    nextBtn.innerHTML = "&raquo;";
    nextBtn.classList.add("pagination-btn");
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.addEventListener("click", () => loadIcons(searchBar.value, currentPage + 1));
    paginationContainer.appendChild(nextBtn);

    // Show page counter
    const pageCounter = document.createElement("div");
    pageCounter.classList.add("page-counter");
    pageCounter.textContent = `Page ${currentPage} of ${totalPages}`;
    paginationContainer.appendChild(pageCounter);
}


// Load icons into the container
async function loadIcons(filter = "", page = 1) {
    // Show loading spinner
    const loadingOverlay = document.querySelector(".loading-overlay");
    loadingOverlay.classList.add("active");

    try {
        // Fetch all icons once if not already fetched
        if (allIcons.length === 0) {
            allIcons = await fetchIcons();
        }

        // Filter and paginate
        const pagedIcons = filterAndPaginateIcons(allIcons, filter, page);
        iconContainer.innerHTML = "";

        // Display the paginated icons
        pagedIcons.forEach(icon => {
            const canvas = document.createElement("canvas");
            canvas.className = "icon";
            canvas.dataset.name = icon.name;
            canvas.dataset.src = icon.src;

            // Add the selected class if this icon is in the selectedIcons array
            if (selectedIcons.includes(icon.name)) {
                canvas.classList.add("selected");
            }

            const ctx = canvas.getContext("2d");

            const img = new Image();
            img.crossOrigin = "anonymous"; // Add this line to enable CORS
            img.src = icon.src;
            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;

                // Store the image so we can redraw it later
                canvas._originalImage = img;

                // Initial draw
                recolorCanvas(canvas, img, currentColor);
            };

            canvas.addEventListener("click", () => toggleSelection(icon.name));
            canvas.addEventListener("contextmenu", (e) => e.preventDefault());

            const iconWrapper = document.createElement("div");
            iconWrapper.style.position = "relative";
            iconWrapper.style.display = "inline-block";
            iconWrapper.style.textAlign = "center";

            const iconName = document.createElement("div");
            iconName.className = "icon-name";
            iconName.textContent = icon.name;

            iconWrapper.appendChild(canvas);
            iconWrapper.appendChild(iconName);
            iconContainer.appendChild(iconWrapper);
        });

        // Show "No icons found" message if filtered to zero
        if (pagedIcons.length === 0) {
            const noIconsMsg = document.createElement("div");
            noIconsMsg.classList.add("no-icons-message");
            noIconsMsg.textContent = "No icons found matching your search.";
            iconContainer.appendChild(noIconsMsg);
        }
    } catch (error) {
        console.error("Error loading icons:", error);
    } finally {
        // Hide loading spinner
        loadingOverlay.classList.remove("active");
    }
}

// Toggle icon selection
function toggleSelection(iconName) {
    const index = selectedIcons.indexOf(iconName);
    if (index > -1) {
        selectedIcons.splice(index, 1);
    } else {
        selectedIcons.push(iconName);
    }
    updateSelectionUI();
    updatePreviewArea(); // Add this line
}

// Update UI for selected icons
function updateSelectionUI() {
    document.querySelectorAll(".icon").forEach(icon => {
        if (selectedIcons.includes(icon.dataset.name)) {
            icon.classList.add("selected");
        } else {
            icon.classList.remove("selected");
        }
    });
}

function updatePreviewArea() {
    const previewContainer = document.getElementById("preview-container");
    const previewSection = document.querySelector(".icons-preview-content");
    const previewToggle = document.querySelector('[data-target=".icons-preview-content"]');
    
    // Remember the current display state before updating
    const isPreviewOpen = previewSection.style.display === "block";
    
    // Clear previous preview content
    previewContainer.innerHTML = "";
    
    // If no icons are selected, show a message
    if (selectedIcons.length === 0) {
        const noSelectionMsg = document.createElement("div");
        noSelectionMsg.className = "preview-text";
        noSelectionMsg.textContent = "No icons selected";
        previewContainer.appendChild(noSelectionMsg);
    } else {
        // Display all selected icon names in a list format
        // Use a single column layout instead of the grid
        previewContainer.style.display = "flex";
        previewContainer.style.flexDirection = "column";
        previewContainer.style.gap = "8px";
        previewContainer.style.width = "100%";
        previewContainer.style.maxHeight = "999999px";
        
        // Display all selected icons without a limit
        selectedIcons.forEach(iconName => {
            const previewItem = document.createElement("div");
            previewItem.className = "preview-text";
            previewItem.textContent = iconName;
            previewContainer.appendChild(previewItem);
        });
    }
    
    // Restore the previous state (open or closed)
    previewSection.style.display = isPreviewOpen ? "block" : "none";
    previewToggle.classList.toggle("collapsed", !isPreviewOpen);
}

// Update the search bar event listener to reset to page 1
searchBar.addEventListener("input", (e) => {
    loadIcons(e.target.value, 1);
});

// Update icon colors with the selected color
function updateIconColors(color) {
    let rafId;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
        document.querySelectorAll(".icon").forEach(canvas => {
            if (canvas._originalImage) {
                recolorCanvas(canvas, canvas._originalImage, color);
            }
        });
    });
}

// Function to capture the current state of a colored canvas
function captureColoredIcon(canvas) {
    // Create a temporary canvas
    const tempCanvas = document.createElement('canvas');
    const ctx = tempCanvas.getContext('2d');

    // Set dimensions
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;

    // Draw the colored icon from our canvas
    ctx.drawImage(canvas, 0, 0);

    // Convert to data URL (PNG format)
    return tempCanvas.toDataURL('image/png').split(',')[1]; // Remove the "data:image/png;base64," part
}


// Loading overlay element
const loadingOverlay = document.querySelector(".loading-overlay");

// Confirm selection and download ZIP
confirmButton.addEventListener("click", async () => {
    if (selectedIcons.length === 0) {
        alert("No icons selected!");
        return;
    }

    try {
        // Show loading spinner
        loadingOverlay.classList.add("active");

        // Fetch all icons if not already fetched
        if (allIcons.length === 0) {
            allIcons = await fetchIcons();
        }

        // Capture colored icons for all selected icons
        const coloredIcons = [];
        for (const iconName of selectedIcons) {
            const iconData = allIcons.find(icon => icon.name === iconName);
            if (iconData) {
                const img = new Image();
                img.crossOrigin = "anonymous"; // Add this line to enable CORS
                img.src = iconData.src;

                await new Promise(resolve => {
                    img.onload = () => {
                        canvas.width = img.width;
                        canvas.height = img.height;

                        // Draw and recolor the icon
                        recolorCanvas(canvas, img, currentColor);

                        // Capture the recolored icon
                        const base64Data = canvas.toDataURL('image/png').split(',')[1];
                        coloredIcons.push({
                            name: iconName,
                            data: base64Data
                        });

                        resolve();
                    };
                });
            }
        }

        const response = await fetch("/api/download", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                coloredIcons // Send the colored icon data directly
            }),
        });

        if (!response.ok) {
            throw new Error("Failed to download icons");
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "selected-icons.zip";
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error(error);
        alert("An error occurred while downloading the icons.");
    } finally {
        // Hide loading spinner
        loadingOverlay.classList.remove("active");
    }
});

document.getElementById("reset-selection").addEventListener("click", () => {
    selectedIcons = [];
    updateSelectionUI();
    updatePreviewArea(); // Add this line
});

function reorganizeColorPicker() {
    // Find the containers we need to modify
    const gradientContainer = document.querySelector('.gradient-picker-container');
    const colorPreview = document.getElementById('color-preview');
    const colorSlider = document.getElementById('color-slider');

    // Remove the color preview from its current position
    colorPreview.remove();

    // Create a new container for the preview and slider
    const previewSliderContainer = document.createElement('div');
    previewSliderContainer.className = 'preview-slider-container';
    previewSliderContainer.style.display = 'flex';
    previewSliderContainer.style.alignItems = 'center';
    previewSliderContainer.style.gap = '10px';
    previewSliderContainer.style.width = '100%';
    // previewSliderContainer.style.marginBottom = '20px';

    // Style the color preview
    // colorPreview.style.width = '60px';
    // colorPreview.style.height = '60px';
    // colorPreview.style.minWidth = '60px';
    // colorPreview.style.borderRadius = '50%';
    // colorPreview.style.boxShadow = '0 0 12px rgba(0, 0, 0, 0.5)';
    // colorPreview.style.marginRight = '10px';

    // Add them to the new container
    previewSliderContainer.appendChild(colorPreview);
    previewSliderContainer.appendChild(colorSlider);

    // Place the new container at the top, right after the gradient
    gradientContainer.insertBefore(previewSliderContainer, document.getElementById('color-gradient').nextSibling);

    // Style the hex input container to be more clickable
    hexInputContainer.style.cursor = 'pointer';
    hexInputContainer.style.transition = 'background-color 0.2s ease';

    // Add hover effect to the hex input container
    hexInputContainer.addEventListener('mouseenter', function () {
        this.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    });

    hexInputContainer.addEventListener('mouseleave', function () {
        this.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
    });
}

document.addEventListener("DOMContentLoaded", function() {
    reorganizeColorPicker();
    updatePreviewArea();
});

const style = document.createElement('style');
style.textContent = `
    #preview-container {
        display: flex;
        flex-direction: column;
        gap: 8px;
        width: 100%;
        max-height: 300px;
        overflow-y: auto;
        padding-right: 5px;
    }
    
    .preview-text {
        padding: 12px;
        border-radius: 8px;
        background-color: #1f2937;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        color: #ecf0f1;
        text-align: left;
        font-size: 0.9rem;
        margin-bottom: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
`;
document.head.appendChild(style);

// Initial load of icons
loadIcons();