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
3. Go to the repository settings > Pages
4. Under "Source", select "main" branch
5. Click "Save" to deploy the website

The website will be available at: https://biagioamodio.github.io/photography/

### 2. Setting up Decap CMS with GitHub OAuth

To allow content editing through Decap CMS, you need to set up GitHub OAuth:

1. Go to your GitHub account settings
2. Navigate to Developer settings > OAuth Apps > New OAuth App
3. Fill in the following details:
   - Application name: Biagio Photography CMS
   - Homepage URL: https://biagioamodio.github.io/photography/
   - Authorization callback URL: https://biagioamodio.github.io/photography/admin/
4. Register the application and note the Client ID
5. Generate a Client Secret and save it securely

#### Option 1: Using a Proxy Server (Recommended)

For security reasons, it's recommended to use a proxy server to handle the OAuth authentication:

1. Deploy a Netlify OAuth proxy server:
   - Fork this repository: https://github.com/decaporg/decap-oauth-provider
   - Deploy it to Netlify or another hosting service
   - Set the Client ID and Client Secret as environment variables

2. Update the `admin/config.yml` file to include:
   ```yaml
   backend:
     name: github
     repo: biagioamodio/photography
     branch: main
     base_url: https://your-oauth-proxy-server.netlify.app
   ```

#### Option 2: Direct GitHub OAuth (For Development)

For local development or testing, you can use direct GitHub OAuth:

1. Create a file named `admin/config.local.yml` with:
   ```yaml
   backend:
     name: github
     repo: biagioamodio/photography
     branch: main
     client_id: your_github_client_id
   ```

2. Note: This approach exposes your Client ID in the frontend code, which is not recommended for production.

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
