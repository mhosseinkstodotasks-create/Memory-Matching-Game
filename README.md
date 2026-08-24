# Memory Matching Game

This project is built using HTML, CSS, JavaScript, and jQuery.

It is a responsive online memory matching game featuring customizable image cards and multiple difficulty levels.

---

## How to Run locally and on a Server

Because the game uses `fetch()` to load the card image manifest (`pictures/images.json`), running the project directly by double-clicking `index.html` (using `file://` protocol) may trigger browser CORS restrictions. You should run it using a local HTTP server or web server host.

### 1. Running Locally

You can serve the game locally using any simple HTTP server:

#### Option A: Python HTTP Server (Recommended)
1. Open your terminal or command prompt in the project root directory.
2. Run one of the following commands depending on your Python version:
   ```bash
   # Python 3
   python3 -m http.server 8000
   ```
3. Open your browser and navigate to:
   ```
   http://localhost:8000
   ```

#### Option B: Node.js `http-server` or `serve`
1. If you have Node.js installed, run:
   ```bash
   npx serve .
   # OR
   npx http-server .
   ```
2. Open the URL printed in the terminal (e.g. `http://localhost:3000` or `http://localhost:8080`).

#### Option C: VS Code Live Server Extension
1. Open the project folder in VS Code.
2. Install the **Live Server** extension.
3. Right-click `index.html` and click **"Open with Live Server"**.

---

### 2. Running on a Web Server / GitHub Pages

This is a 100% static client-side web application and requires no backend server code or database.

#### Hosting on GitHub Pages:
1. Push this repository to GitHub.
2. Go to your repository **Settings** > **Pages**.
3. Under **Source**, select `main` (or `master`) branch and `/ (root)` folder.
4. Click **Save**.
5. Your game will be live at `https://<your-username>.github.io/<repo-name>/`.

#### Hosting on Nginx / Apache / Caddy:
Copy all repository files directly to your web server's document root (e.g., `/var/www/html/`).

---

## Image Management

### Adding / Replacing Images
1. Place your image files (`.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`) inside the `pictures/` directory.
2. Update `pictures/images.json` to list the image filenames:
   ```json
   [
       "image1.jpg",
       "image2.png",
       "image3.webp"
   ]
   ```
3. Save the file and reload the game!

*Note: The game requires at least 18 unique images in `pictures/images.json` to enable the maximum 6x6 level.*
