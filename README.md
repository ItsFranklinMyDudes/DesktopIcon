# Desktop Icon Selector

Desktop Icon Selector is a web application that allows users to browse, customize, and download desktop icons. Users can select icons, apply custom colors, and download them as a ZIP file. Additionally, users can request new icons through a simple form.

## Features

- Browse a collection of desktop icons.
- Apply custom colors to icons using a gradient color picker.
- Search for icons by name.
- Select multiple icons and download them as a ZIP file.
- Request new icons via a form with file upload support.
- Responsive design for desktop devices.

## Technologies Used

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express.js
- **File Handling**: Multer for file uploads
- **Packaging**: Archiver for creating ZIP files
- **Environment Variables**: dotenv for configuration
- **Webhook Integration**: Discord webhook for icon requests

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/desktop-icon-selector.git
   cd desktop-icon-selector
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory and configure the following variables:
   ```
   PORT=3000
   USE_CDN=false
   WEBHOOK_URL=<your_discord_webhook_url>
   ```

4. Start the server:
   ```bash
   npm start
   ```

5. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## Usage

### Browsing Icons
- Icons are displayed in a grid format.
- Use the search bar to filter icons by name.
- Click on an icon to select or deselect it.

### Customizing Colors
- Use the gradient color picker to choose a color.
- The selected color is applied to all icons in real-time.

### Downloading Icons
- Select the icons you want to download.
- Click the "Download Selection" button to download a ZIP file containing the selected icons.

### Requesting New Icons
- Navigate to the "Request a New Icon" page.
- Fill out the form, upload a reference image, and submit your request.

## Folder Structure

```
DesktopIcon/
├── uploads/               # Directory for uploaded files
├── icons/                 # Directory for icon files
├── public/                # Static assets (CSS, JS, images)
├── .env                   # Environment variables
├── server.js              # Backend server
├── app.js                 # Frontend logic
├── style.css              # Global styles
├── requestStyle.css       # Styles for the request page
├── README.md              # Documentation
└── package.json           # Project metadata and dependencies
```

## Environment Variables

| Variable      | Description                              | Default Value |
|---------------|------------------------------------------|---------------|
| `PORT`        | Port number for the server               | `3000`        |
| `USE_CDN`     | Use CDN for serving icons                | `false`       |
| `WEBHOOK_URL` | Discord webhook URL for icon requests    | N/A           |

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a new branch:
   ```bash
   git checkout -b feature-name
   ```
3. Make your changes and commit them:
   ```bash
   git commit -m "Add feature-name"
   ```
4. Push to your fork:
   ```bash
   git push origin feature-name
   ```
5. Open a pull request.

## License

This project is licensed under the [GNU General Public License v3.0](LICENSE).

## Acknowledgments

- Icons provided by the community.
- Built with love using Node.js and Express.js.