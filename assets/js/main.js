$(document).ready(function() {
  // Set active navigation item based on current page
  const currentPage = window.location.pathname.split('/').pop();
  
  if (currentPage === 'index.html' || currentPage === '') {
    $('#nav-home').addClass('active');
  } else if (currentPage === 'about.html') {
    $('#nav-about').addClass('active');
  } else if (currentPage === 'series.html' || currentPage.includes('serie.html')) {
    $('#nav-series').addClass('active');
  }

  // Initialize Masonry for homepage
  if (currentPage === 'index.html' || currentPage === '') {
    $('.masonry-grid').masonry({
      itemSelector: '.grid-item',
      columnWidth: '.grid-sizer',
      percentPosition: true
    });
  }

  // Series page hover effect
  $('.series-item').hover(
    function() {
      $(this).find('.series-title').css('opacity', 1);
    },
    function() {
      $(this).find('.series-title').css('opacity', 0);
    }
  );

  // Serie page photo navigation
  let currentPhotoIndex = 0;
  const photos = window.serieData ? window.serieData.photos : [];
  
  if (photos.length > 0 && currentPage.includes('serie.html')) {
    // Load initial photo
    loadPhoto(currentPhotoIndex);
    
    // Previous photo button
    $('.prev-photo').click(function(e) {
      e.preventDefault();
      currentPhotoIndex = (currentPhotoIndex - 1 + photos.length) % photos.length;
      loadPhoto(currentPhotoIndex);
    });
    
    // Next photo button
    $('.next-photo').click(function(e) {
      e.preventDefault();
      currentPhotoIndex = (currentPhotoIndex + 1) % photos.length;
      loadPhoto(currentPhotoIndex);
    });
  }
  
  // Function to load photo and metadata
  function loadPhoto(index) {
    if (!photos[index]) return;
    
    const photo = photos[index];
    $('#photo-image').attr('src', photo.image);
    $('#photo-metadata').text(photo.metadata);
  }
});

// Function to load series data from JSON
function loadSeriesData() {
  $.getJSON('_data/series.json', function(data) {
    window.seriesData = data;
    
    // If on series.html, populate the grid
    if (window.location.pathname.endsWith('series.html')) {
      populateSeriesGrid(data);
    }
    
    // If on serie.html, load the specific serie
    if (window.location.pathname.endsWith('serie.html')) {
      const urlParams = new URLSearchParams(window.location.search);
      const serieId = urlParams.get('id');
      
      if (serieId) {
        const serie = data.find(s => s.id === serieId);
        if (serie) {
          window.serieData = serie;
          loadSerieContent(serie);
        }
      }
    }
  });
}

// Function to populate series grid
function populateSeriesGrid(series) {
  const grid = $('.series-grid');
  grid.empty();
  
  series.forEach(serie => {
    const featuredImage = serie.photos[0].image;
    
    const item = $('<div class="series-item">');
    const link = $('<a>').attr('href', `serie.html?id=${serie.id}`);
    const img = $('<img>').attr('src', featuredImage).attr('alt', serie.title);
    const titleOverlay = $('<div class="series-title">').html(`<h2>${serie.title}</h2>`);
    
    link.append(img).append(titleOverlay);
    item.append(link);
    grid.append(item);
  });
}

// Function to load serie content
function loadSerieContent(serie) {
  // Set serie title
  $('.serie-title').text(serie.title);
  
  // Trigger event for serie loaded
  $(document).trigger('serieLoaded', [serie]);
  
  // Create an array of all slides (description + photos)
  const slides = [
    { type: 'description', content: serie.description },
    ...serie.photos.map(photo => ({ type: 'photo', content: photo }))
  ];
  
  let currentSlideIndex = 0;
  
  // Function to load a slide (description or photo)
  function loadSlide(index) {
    const slide = slides[index];
    const contentDisplay = $('#content-display');
    contentDisplay.empty();
    
    if (slide.type === 'description') {
      // Load description
      const descriptionElement = $('<div class="serie-description"></div>');
      descriptionElement.html(slide.content.replace(/\n\n/g, '<br><br>'));
      contentDisplay.append(descriptionElement);
      
      // Hide metadata for description
      $('#photo-metadata').text('');
    } else {
      // Load photo
      const photoElement = $('<img>').attr({
        src: slide.content.image,
        alt: serie.title,
        class: 'photo-image'
      });
      contentDisplay.append(photoElement);
      
      // Set metadata for photo
      $('#photo-metadata').text(slide.content.metadata);
    }
    
    // Update slide indicator
    $('#slide-indicator').text(`${index + 1} / ${slides.length}`);
  }
  
  // Load initial slide (description)
  loadSlide(currentSlideIndex);
  
  // Previous slide button
  $('.prev-photo').click(function(e) {
    e.preventDefault();
    currentSlideIndex = (currentSlideIndex - 1 + slides.length) % slides.length;
    loadSlide(currentSlideIndex);
  });
  
  // Next slide button
  $('.next-photo').click(function(e) {
    e.preventDefault();
    currentSlideIndex = (currentSlideIndex + 1) % slides.length;
    loadSlide(currentSlideIndex);
  });
  
  // Set navigation links for series
  if (window.seriesData) {
    const serieIndex = window.seriesData.findIndex(s => s.id === serie.id);
    const prevIndex = (serieIndex - 1 + window.seriesData.length) % window.seriesData.length;
    const nextIndex = (serieIndex + 1) % window.seriesData.length;
    
    $('.prev-serie').attr('href', `serie.html?id=${window.seriesData[prevIndex].id}`);
    $('.next-serie').attr('href', `serie.html?id=${window.seriesData[nextIndex].id}`);
  }
}

// Load series data on page load
$(document).ready(function() {
  loadSeriesData();
});
