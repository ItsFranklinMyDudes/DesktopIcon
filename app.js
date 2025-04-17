const iconContainer = document.getElementById("icon-container");
const searchBar = document.getElementById("search-bar");
const confirmButton = document.getElementById("confirm-selection");
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

let selectedIcons = [];
let currentColor = "#FF0000"; // Default red
let currentHue = 0; // Default hue (red)
let pickerPos = { x: 0, y: 0 }; // Position in the color gradient

// Set up the gradient picker
let isPickingColor = false;
let isAdjustingHue = false;

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
}

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

    // In our mapping:
    // x = saturation (0 at left, 1 at right)
    // y = value/brightness (1 at top, 0 at bottom)
    const s = x;
    const v = 1 - y;

    updateColorFromHsv(currentHue, s, v);
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
    let x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

    currentHue = Math.round(x * 360);

    // Update slider cursor position
    hueCursor.style.left = `${x * 100}%`;

    // Update the gradient with the new hue
    updateColorGradient(currentHue);

    // Update color using current picker position
    updateColorFromHsv(currentHue, pickerPos.x, 1 - pickerPos.y);
}

function stopAdjustingHue() {
    isAdjustingHue = false;
}

function updateColorGradient(hue) {
    // Create a gradient that:
    // - Has pure color of current hue at top right
    // - Has white at top left
    // - Has black at bottom
    const hueColor = hslToRgb(hue / 360, 1, 0.5);
    const hueRgb = `rgb(${hueColor.r}, ${hueColor.g}, ${hueColor.b})`;

    colorGradient.style.background = `
        linear-gradient(to right, white, ${hueRgb}),
        linear-gradient(to bottom, rgba(0,0,0,0), black)
    `;
    colorGradient.style.backgroundBlendMode = "multiply";
}

function updateFromRgb() {
    const r = parseInt(rInput.value) || 0;
    const g = parseInt(gInput.value) || 0;
    const b = parseInt(bInput.value) || 0;

    updateColorFromRgb(r, g, b);
}

function updateColorFromHsv(h, s, v) {
    const rgb = hsvToRgb(h, s, v);
    updateColorFromRgb(rgb.r, rgb.g, rgb.b);
}

function updateColorFromRgb(r, g, b) {
    // Clamp values
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

    // Update color preview
    colorPreview.style.backgroundColor = hex;

    // Update the hidden color picker for compatibility
    colorPicker.value = hex;

    // Convert to HSV and update picker position if needed
    const hsv = rgbToHsv(r, g, b);

    // Update hue if color is not grayscale
    if (hsv.s > 0.05 && hsv.v > 0.05) {
        if (Math.abs(hsv.h - currentHue) > 5) {
            currentHue = hsv.h;
            updateColorGradient(currentHue);

            // Update hue slider position
            hueCursor.style.left = `${(currentHue / 360) * 100}%`;
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

// Set up color option selection
colorOptions.forEach(option => {
    option.addEventListener("click", function () {
        const color = this.dataset.color;
        const rgb = hexToRgb(color);
        updateColorFromRgb(rgb.r, rgb.g, rgb.b);
    });
});

// Color conversion utilities
function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1).toUpperCase();
}

function hexToRgb(hex) {
    hex = hex.replace(/^#/, '');
    if (hex.length === 3) {
        hex = hex.split('').map(char => char + char).join('');
    }

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
async function fetchIcons(filter = "") {
    try {
        const response = await fetch("/api/icons");
        const icons = await response.json();
        return icons.filter(icon =>
            icon.name.toLowerCase().includes(filter.toLowerCase())
        );
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

// Load icons into the container
async function loadIcons(filter = "") {
    const icons = await fetchIcons(filter);
    iconContainer.innerHTML = "";
    
    icons.forEach(icon => {
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

// Handle search input
searchBar.addEventListener("input", (e) => {
    loadIcons(e.target.value);
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

        // Capture colored icons
        const coloredIcons = [];
        for (const iconName of selectedIcons) {
            const iconCanvas = document.querySelector(`.icon[data-name="${iconName}"]`);
            if (iconCanvas) {
                const base64Data = captureColoredIcon(iconCanvas);
                coloredIcons.push({
                    name: iconName,
                    data: base64Data
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

// Initial load of icons
loadIcons();
