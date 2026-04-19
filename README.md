# Biagio Amodio Photography Website

A minimalist photography website built with HTML, CSS, and JavaScript, featuring a responsive design and series-based photo organization.

## Features

- Responsive design using Bootstrap
- Masonry layout for the homepage
- Series-based photo organization
- No scrolling - content fits screen height

## Setup and Deployment

### GitHub Pages Deployment

The website is designed to be hosted on GitHub Pages from the repository: https://github.com/biagioamodio/photography

1. Make sure the repository is public
2. Push all the website files to the repository
3. **Important**: Make sure the `.nojekyll` file is in the root of your repository
   - This file tells GitHub Pages not to process the site with Jekyll
   - Without this file, directories starting with underscore (like `_includes` and `_data`) won't be accessible
4. Go to the repository settings > Pages
5. Under "Source", select "main" branch
6. Click "Save" to deploy the website

The website will be available at: https://biagioamodio.github.io/photography/

## File Structure

- `index.html` - Homepage with masonry layout
- `series.html` - Grid of all photo series
- `serie.html` - Individual series page with photo navigation
- `about.html` - About page with bio and links
- `assets/` - Contains all static assets
  - `css/` - Stylesheet files
  - `js/` - JavaScript files
  - `fonts/` - Font files
  - `uploads/` - Photos and images
- `_data/` - JSON data files for content
  - `series.json` - Photo series data
  - `about.json` - About page content
- `_includes/` - Reusable HTML components

## Development

To run the website locally:

1. Clone the repository
2. Open the project in a code editor
3. Use a local server to serve the files (e.g., Live Server extension in VS Code)
4. Access the website at `http://localhost:port`

## Managing Content

### Editing Series

Edit the `_data/series.json` file to add, remove, or modify photo series. Each series has:
- `id` - Unique identifier
- `title` - Series title
- `description` - Series description
- `photos` - Array of photos with `image` path and `metadata`

### Editing About Page

Edit the `_data/about.json` file to update the about page content including profile image, bio, and links.

## License

All rights reserved. The content and design of this website are proprietary to Biagio Amodio.
