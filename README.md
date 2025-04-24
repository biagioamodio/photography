# Biagio Amodio Photography Website

A minimalist photography website built with HTML, CSS, and JavaScript, featuring a responsive design and content management through Decap CMS.

## Features

- Responsive design using Bootstrap
- Masonry layout for the homepage
- Series-based photo organization
- No scrolling - content fits screen height
- Decap CMS integration for content management

## Setup and Deployment

### 1. GitHub Repository Setup

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

### 2. Setting up Decap CMS with Netlify Identity

To allow content editing through Decap CMS, you need to set up Netlify Identity:

1. **Create a Netlify site**:
   - Sign up for a Netlify account if you don't have one: https://app.netlify.com/signup
   - Click "New site from Git"
   - Choose GitHub as your Git provider
   - Select your repository (biagioamodio/photography)
   - Configure build settings (or leave as default if you don't have a build process)
   - Click "Deploy site"

2. **Enable Netlify Identity**:
   - Once your site is deployed, go to "Site settings" > "Identity"
   - Click "Enable Identity"
   - Under "Registration preferences", choose "Invite only" (recommended)
   - Under "External providers", add GitHub as a provider (optional)
   - Set the "Git Gateway" URL to your GitHub repository URL

3. **Configure Git Gateway**:
   - In your Netlify site dashboard, go to "Site settings" > "Identity" > "Services"
   - Enable "Git Gateway"
   - This allows the CMS to commit changes to your repository

4. **Invite yourself as a user**:
   - Go to "Identity" > "Invite users"
   - Enter your email address
   - Accept the invitation that arrives in your email

5. **Update your Netlify site settings**:
   - Go to "Site settings" > "General" > "Site details"
   - Under "Site information", make sure the site name generates a URL you want to use
   - Optionally, set a custom domain if you have one

6. **Push the updated files to your GitHub repository**:
   - The site is configured to use Netlify Identity with the correct paths
   - Make sure all files are committed and pushed to the main branch

### Troubleshooting "Not Found" Issues After Login

If you encounter a "not found" error after logging in with GitHub, try these solutions:

1. **Use the callback page**:
   - Instead of going directly to `/admin/`, use `/admin/callback.html`
   - This page will handle authentication and redirect you properly

2. **Check browser console for errors**:
   - Open your browser's developer tools (F12 or right-click > Inspect)
   - Look for any error messages in the Console tab

3. **Verify Netlify Identity configuration**:
   - Make sure your Netlify site is properly connected to your GitHub repository
   - Check that Git Gateway is enabled and configured correctly

4. **Clear browser cache and cookies**:
   - Sometimes cached authentication data can cause issues
   - Clear your browser cache and cookies, then try again

Note: While your site is hosted on GitHub Pages, the authentication and content management are handled by Netlify.

## Using Decap CMS

Once set up, you can access the CMS at: https://biagioamodio.github.io/photography/admin/

### Managing Series

1. Log in with your GitHub account
2. Navigate to "Series" in the sidebar
3. Create a new series or edit existing ones
4. For each series, you can:
   - Set a title and description
   - Add/remove photos
   - Set metadata for each photo

### Managing About Page

1. Navigate to "About Page" in the sidebar
2. Edit the profile image, bio text, and links
3. Save changes to update the about page

## File Structure

- `index.html` - Homepage with masonry layout
- `series.html` - Grid of all photo series
- `serie.html` - Individual series page with photo navigation
- `about.html` - About page with bio and links
- `assets/` - Contains all static assets
  - `css/` - Stylesheet files
  - `js/` - JavaScript files
  - `fonts/` - Font files
  - `uploads/` - Uploaded images
- `_data/` - JSON data files for content
- `_includes/` - Reusable HTML components
- `admin/` - Decap CMS configuration and admin interface

## Development

To run the website locally:

1. Clone the repository
2. Open the project in a code editor
3. Use a local server to serve the files (e.g., Live Server extension in VS Code)
4. Access the website at `http://localhost:port`

## License

All rights reserved. The content and design of this website are proprietary to Biagio Amodio.
