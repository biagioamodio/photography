$(document).ready(function() {
  // Wrap main content in page-content div for transitions
  $('.container-fluid > .row').wrapAll('<div class="page-content fade-transition"></div>');
  
  // Set active navigation item based on current page
  const currentPage = window.location.pathname.split('/').pop();
  
  if (currentPage === 'index.html' || currentPage === '') {
    $('#nav-home').addClass('active');
  } else if (currentPage === 'about.html') {
    $('#nav-about').addClass('active');
  } else if (currentPage === 'series.html' || currentPage.includes('serie.html')) {
    $('#nav-series').addClass('active');
  }
  
  // Add click event to all navigation links for page transitions
  $('body').on('click', 'a[href]', function(e) {
    const href = $(this).attr('href');
    
    // Only handle internal links that are not anchors
    if (href && href.startsWith('http') === false && 
        href !== '#' && !href.startsWith('#') && 
        !$(this).hasClass('prev-photo') && !$(this).hasClass('next-photo')) {
      e.preventDefault();
      
      // Fade out current page
      $('.page-content').addClass('fade-out');
      
      // Navigate to new page after transition
      setTimeout(function() {
        window.location.href = href;
      }, 300);
    }
  });

  // Initialize Masonry for homepage
  if (currentPage === 'index.html' || currentPage === '') {
    // Load random images for homepage
    loadRandomImagesForHomepage();
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
    // Handle both formats: direct array or nested under "series" property
    const seriesData = Array.isArray(data) ? data : (data.series || []);
    window.seriesData = seriesData;
    
    // If on series.html, populate the grid
    if (window.location.pathname.endsWith('series.html')) {
      populateSeriesGrid(seriesData);
    }
    
    // If on serie.html, load the specific serie
    if (window.location.pathname.endsWith('serie.html')) {
      const urlParams = new URLSearchParams(window.location.search);
      const serieId = urlParams.get('id');
      
      if (serieId) {
        const serie = seriesData.find(s => s.id === serieId);
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
  
  // Function to load a slide (description or photo) with fade transition
  function loadSlide(index) {
    const slide = slides[index];
    const contentDisplay = $('#content-display');
    const isFirstSlide = index === 0;
    const isLastSlide = index === slides.length - 1;
    
    // Fade out current content
    contentDisplay.addClass('fade-transition fade-out');
    
    // After fade out, update content and fade in
    setTimeout(function() {
      contentDisplay.empty();
      
      if (slide.type === 'description') {
        // Load description
        const descriptionElement = $('<div class="serie-description fade-transition"></div>');
        descriptionElement.html(slide.content.replace(/\n\n/g, '<br><br>'));
        contentDisplay.append(descriptionElement);
        
        // Hide metadata for description
        $('#photo-metadata').text('');
      } else {
        // Load photo
        const photoElement = $('<img>').attr({
          src: slide.content.image,
          alt: serie.title,
          class: 'photo-image fade-transition'
        });
        contentDisplay.append(photoElement);
        
        // Set metadata for photo
        $('#photo-metadata').text(slide.content.metadata);
      }
      
      // Handle navigation arrows visibility
      // Hide left arrow on first slide
      if (isFirstSlide) {
        $('.left-arrow-container').hide();
      } else {
        $('.left-arrow-container').show();
      }
      
      // Hide right arrow on last slide
      if (isLastSlide) {
        $('.right-arrow-container').hide();
      } else {
        $('.right-arrow-container').show();
      }
      
      // Update slide indicator
      $('#slide-indicator').text(`${index + 1} / ${slides.length}`);
      
      // Fade in new content
      contentDisplay.removeClass('fade-out');
    }, 300);
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
    const isFirstSerie = serieIndex === 0;
    const isLastSerie = serieIndex === window.seriesData.length - 1;
    
    // Set links
    $('.prev-serie').attr('href', `serie.html?id=${window.seriesData[prevIndex].id}`);
    $('.next-serie').attr('href', `serie.html?id=${window.seriesData[nextIndex].id}`);
    
    // Hide/show navigation links based on position
    if (isFirstSerie) {
      $('.prev-serie').hide();
    } else {
      $('.prev-serie').show();
    }
    
    if (isLastSerie) {
      $('.next-serie').hide();
    } else {
      $('.next-serie').show();
    }
  }
}

// Load series data on page load
$(document).ready(function() {
  loadSeriesData();
});

// Function to load random images for homepage
function loadRandomImagesForHomepage() {
  // If seriesData is not loaded yet, load it first
  if (!window.seriesData) {
    $.getJSON('_data/series.json', function(data) {
      // Handle both formats: direct array or nested under "series" property
      const seriesData = Array.isArray(data) ? data : (data.series || []);
      window.seriesData = seriesData;
      generateRandomImages(seriesData);
    });
  } else {
    generateRandomImages(window.seriesData);
  }
  
  // Function to generate random images from all series
  function generateRandomImages(seriesData) {
    // Extract all image paths from all series
    const allImages = [];
    seriesData.forEach(serie => {
      serie.photos.forEach(photo => {
        allImages.push({
          image: photo.image,
          title: serie.title
        });
      });
    });
    
    // Shuffle the array of images
    const shuffledImages = shuffleArray(allImages);
    
    // Select the first 15 images (or all if less than 15)
    const selectedImages = shuffledImages.slice(0, 15);
    
    // Generate grid items for each selected image
    const grid = $('.masonry-grid');
    
    selectedImages.forEach(item => {
      const gridItem = $('<div class="grid-item">');
      const img = $('<img>').attr('src', item.image).attr('alt', item.title);
      
      gridItem.append(img);
      grid.append(gridItem);
    });
    
    // Initialize Masonry after images are loaded
    $('.masonry-grid').imagesLoaded(function() {
      $('.masonry-grid').masonry({
        itemSelector: '.grid-item',
        columnWidth: '.grid-sizer',
        percentPosition: true,
        gutter: 8,
        transitionDuration: '0.2s'
      });
    });
  }
  
  // Function to shuffle an array (Fisher-Yates algorithm)
  function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  }
}
