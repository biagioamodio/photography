$(document).ready(function() {
  // Initialize theme from localStorage or default to light
  initializeTheme();
  
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

  // Initialize home slideshow
  if (currentPage === 'index.html' || currentPage === '') {
    loadHomeSlides();
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
  // Use baseUrl for loading JSON data
  const jsonPath = (window.baseUrl || '/') + '_data/series.json';
  
  $.getJSON(jsonPath, function(data) {
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
    // Get the first photo from the series
    const featuredImage = serie.photos[0].image;
    
    // Create elements with proper paths
    const item = $('<div class="series-item">');
    const link = $('<a>').attr('href', (window.baseUrl || '/') + `serie.html?id=${serie.id}`);
    
    // Use baseUrl for image paths if they're relative
    let imgSrc = featuredImage;
    if (imgSrc.startsWith('assets/')) {
      imgSrc = (window.baseUrl || '/') + featuredImage;
    }
    
    const img = $('<img>').attr('src', imgSrc).attr('alt', serie.title);
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
  
  // Create an array of all slides (description slide only if description is non-empty, then photos)
  const slides = [
    ...(serie.description ? [{ type: 'description', content: serie.description }] : []),
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
        $('#photo-darkroom').text('');
      } else {
        // Load photo with proper path
        let imgSrc = slide.content.image;
        if (imgSrc.startsWith('assets/')) {
          imgSrc = (window.baseUrl || '/') + imgSrc;
        }
        
        const photoElement = $('<img>').attr({
          src: imgSrc,
          alt: serie.title,
          class: 'photo-image fade-transition'
        });
        contentDisplay.append(photoElement);
        
        // Set metadata — only filled fields, compacted to top in CMS order
        const meta = slide.content.metadata;
        if (meta && typeof meta === 'object') {
          const gearRows = [meta.camera, meta.lens, meta.filmRoll]
            .filter(v => v && v.trim())
            .map(v => $('<span>').text(v).prop('outerHTML'));
          $('#photo-metadata').html(gearRows.join('<br>'));

          const darkroomRows = [meta.developing, meta.scanning, meta.printing]
            .filter(v => v && v.trim())
            .map(v => $('<span>').text(v).prop('outerHTML'));
          $('#photo-darkroom').html(darkroomRows.join('<br>'));
        } else {
          $('#photo-metadata').html($('<span>').text(typeof meta === 'string' ? meta : '').prop('outerHTML'));
          $('#photo-darkroom').html('');
        }
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
  
  // Click handler for serie title - go back to first slide
  $('.serie-title').css('cursor', 'pointer').click(function(e) {
    e.preventDefault();
    if (currentSlideIndex !== 0) {
      currentSlideIndex = 0;
      loadSlide(currentSlideIndex);
    }
  });
  
  // Set navigation links for series
  if (window.seriesData) {
    const serieIndex = window.seriesData.findIndex(s => s.id === serie.id);
    const prevIndex = (serieIndex - 1 + window.seriesData.length) % window.seriesData.length;
    const nextIndex = (serieIndex + 1) % window.seriesData.length;
    const isFirstSerie = serieIndex === 0;
    const isLastSerie = serieIndex === window.seriesData.length - 1;
    
    // Set links
    $('.prev-serie').attr('href', (window.baseUrl || '/') + `serie.html?id=${window.seriesData[prevIndex].id}`);
    $('.next-serie').attr('href', (window.baseUrl || '/') + `serie.html?id=${window.seriesData[nextIndex].id}`);
    
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

// ── Home Slideshow ────────────────────────────────────────────────────────────

function loadHomeSlides() {
  const jsonPath = (window.baseUrl || '/') + '_data/home.json';

  $.getJSON(jsonPath, function(data) {
    const slides = (data.slides || []).filter(function(s) { return s.background; });
    if (slides.length === 0) { loadRandomImagesForHomepage(); return; }

    const $wrap = $('.home-slideshow-wrap');
    $wrap.empty();

    const $show = $('<div class="home-slideshow"></div>');

    // Build each slide
    slides.forEach(function(slide, index) {
      const $slide = $('<div class="home-slide' + (index === 0 ? ' active' : '') + '"></div>');

      // Composite wrap: BG behind, FG in front at bottom
      const $cwrap = $('<div class="home-composite-wrap"></div>');
      const $bg    = $('<img class="home-bg-img" alt="">');
      const $fg    = $('<img class="home-fg-img" alt="">');

      if (slide.background) $bg.attr('src', resolveUrl(slide.background));
      if (slide.foreground)  $fg.attr('src', resolveUrl(slide.foreground));
      else                   $fg.hide();

      $cwrap.append($bg, $fg);
      $slide.append($cwrap);

      // Text overlay
      if (slide.text && slide.text.trim()) {
        const $txt = $('<div class="home-slide-text"></div>').text(slide.text);
        const alpha = Math.min(1, (slide.shadowIntensity || 0) / 100);
        const dist  = slide.shadowDistance || 0;
        $txt.css({
          left:        (slide.textX || 50) + '%',
          top:         (slide.textY || 50) + '%',
          fontWeight:  slide.textBold       ? 'bold'   : 'normal',
          fontStyle:   slide.textItalic     ? 'italic' : 'normal',
          textAlign:   slide.textAlign      || 'center',
          lineHeight:  slide.textLineHeight || 1.2,
          color:       slide.textColor      || '#ffffff',
          textShadow:  (slide.shadowEnabled !== false && alpha > 0)
                         ? '0 ' + dist + 'px ' + (dist * 2) + 'px rgba(0,0,0,' + alpha + ')'
                         : 'none',
        });
        $slide.append($txt);
      }

      $show.append($slide);

      // Apply composite layout whenever BG loads (or immediately if cached)
      var posX = (slide.imagePosX != null ? slide.imagePosX : 50) / 100;
      var posY = (slide.imagePosY != null ? slide.imagePosY : 50) / 100;
      var tSize = slide.textSize || 5;

      function layout() {
        homeCompositeLayout($slide[0], $bg[0], $cwrap[0], posX, posY);
        // Font size: textSize % of container height
        var fsPx = $slide[0].offsetHeight * (tSize / 100);
        $slide.find('.home-slide-text').css('font-size', fsPx + 'px');
      }

      $bg[0].onload = layout;
      // Don't call layout() here — slide is not in the DOM yet so offsetWidth = 0.
      // The initial pass runs via requestAnimationFrame below after $wrap.append($show).
    });

    // Navigation (only when multiple slides)
    if (slides.length > 1) {
      var current = 0;

      var $prev = $('<button class="slide-nav slide-prev" aria-label="Previous">&#8249;</button>');
      var $next = $('<button class="slide-nav slide-next" aria-label="Next">&#8250;</button>');
      var $dots = $('<div class="slide-dots"></div>');

      slides.forEach(function(_, i) {
        $dots.append($('<span class="slide-dot' + (i === 0 ? ' active' : '') + '" data-index="' + i + '"></span>'));
      });

      function goTo(n) {
        current = ((n % slides.length) + slides.length) % slides.length;
        $show.find('.home-slide').removeClass('active').eq(current).addClass('active');
        $dots.find('.slide-dot').removeClass('active').eq(current).addClass('active');
      }

      $prev.on('click', function() { goTo(current - 1); });
      $next.on('click', function() { goTo(current + 1); });
      $dots.on('click', '.slide-dot', function() { goTo(+$(this).data('index')); });

      // Keyboard navigation
      $(document).on('keydown.homeSlides', function(e) {
        if (e.key === 'ArrowLeft')  goTo(current - 1);
        if (e.key === 'ArrowRight') goTo(current + 1);
      });

      $show.append($prev, $next, $dots);
    }

    $wrap.append($show);

    function applyAllLayouts() {
      $show.find('.home-slide').each(function(i) {
        var slide = slides[i];
        var $bg   = $(this).find('.home-bg-img');
        if ($bg[0] && $bg[0].naturalWidth > 0) {
          homeCompositeLayout(
            this, $bg[0], $(this).find('.home-composite-wrap')[0],
            (slide.imagePosX != null ? slide.imagePosX : 50) / 100,
            (slide.imagePosY != null ? slide.imagePosY : 50) / 100
          );
          var fsPx = this.offsetHeight * ((slide.textSize || 5) / 100);
          $(this).find('.home-slide-text').css('font-size', fsPx + 'px');
        }
      });
    }

    // Initial pass — rAF ensures the browser has laid out the DOM so offsetWidth is valid
    requestAnimationFrame(applyAllLayouts);

    // Reapply on window resize
    $(window).on('resize.homeSlides', applyAllLayouts);

  }).fail(function() {
    // Graceful fallback to old masonry if home.json is missing or empty
    loadRandomImagesForHomepage();
  });
}

// Same cover-with-focal-point math as the CMS applyCompositeLayout()
function homeCompositeLayout(container, bgImg, compositeWrap, posX, posY) {
  var cw = container.offsetWidth;
  var ch = container.offsetHeight;
  if (!cw || !ch) return;

  var bw = bgImg.naturalWidth  || cw;
  var bh = bgImg.naturalHeight || ch;
  var compositeAR = bw / bh;
  var containerAR = cw / ch;

  var wrapW, wrapH, wrapL, wrapT;
  if (compositeAR > containerAR) {
    wrapH = ch;  wrapW = ch * compositeAR;
    wrapT = 0;
    wrapL = Math.min(0, Math.max(-(wrapW - cw), cw / 2 - posX * wrapW));
  } else {
    wrapW = cw;  wrapH = cw / compositeAR;
    wrapL = 0;
    wrapT = Math.min(0, Math.max(-(wrapH - ch), ch / 2 - posY * wrapH));
  }

  compositeWrap.style.width  = wrapW + 'px';
  compositeWrap.style.height = wrapH + 'px';
  compositeWrap.style.left   = wrapL + 'px';
  compositeWrap.style.top    = wrapT + 'px';
}

function resolveUrl(path) {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return (window.baseUrl || '/') + path;
}

// ── Legacy masonry (kept as fallback) ─────────────────────────────────────────

// Function to load random images for homepage
function loadRandomImagesForHomepage() {
  const jsonPath = (window.baseUrl || '/') + '_data/series.json';
  
  $.getJSON(jsonPath, function(data) {
    // Handle both formats: direct array or nested under "series" property
    const seriesData = Array.isArray(data) ? data : (data.series || []);
    
    // Collect all images with their series info
    let allImages = [];
    seriesData.forEach(function(series) {
      series.photos.forEach(function(photo) {
        allImages.push({
          image: photo.image,
          metadata: photo.metadata,
          seriesId: series.id,
          seriesTitle: series.title
        });
      });
    });
    
    // Fisher-Yates shuffle algorithm for true randomization
    function shuffleArray(array) {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    }
    
    // Shuffle and select 18 images (or all if less than 18)
    const shuffledImages = shuffleArray(allImages);
    const selectedImages = shuffledImages.slice(0, 18);
    
    // Get the masonry grid container
    const $grid = $('.masonry-grid');
    
    // Clear existing content
    $grid.empty();
    
    // Create 3 column divs
    const $column1 = $('<div class="masonry-column"></div>');
    const $column2 = $('<div class="masonry-column"></div>');
    const $column3 = $('<div class="masonry-column"></div>');
    
    // Distribute images across the 3 columns
    // Using round-robin distribution: 0->col1, 1->col2, 2->col3, 3->col1, etc.
    selectedImages.forEach(function(imageData, index) {
      // Construct proper image path
      let imgSrc = imageData.image;
      if (imgSrc.startsWith('assets/')) {
        imgSrc = (window.baseUrl || '/') + imgSrc;
      }
      
      // Create grid item with data attributes for modal
      const $item = $('<div class="grid-item">')
        .attr('data-image-src', imgSrc)
        .attr('data-series-id', imageData.seriesId)
        .attr('data-series-title', imageData.seriesTitle);
      
      const $img = $('<img>')
        .attr('src', imgSrc)
        .attr('alt', imageData.seriesTitle);
      
      $item.append($img);
      
      // Distribute to columns using modulo
      const columnIndex = index % 3;
      if (columnIndex === 0) {
        $column1.append($item);
      } else if (columnIndex === 1) {
        $column2.append($item);
      } else {
        $column3.append($item);
      }
    });
    
    // Append columns to grid
    $grid.append($column1, $column2, $column3);
    
    // Initialize the image modal after grid is populated
    initializeImageModal();
  }).fail(function(jqXHR, textStatus, errorThrown) {
    console.error('Error loading series data:', textStatus, errorThrown);
  });
}

// ===== Image Modal Functions =====
function initializeImageModal() {
  const modal = $('#image-modal');
  const modalImage = $('#modal-image');
  const modalTitle = $('.modal-series-title');
  const modalLink = $('.modal-series-link');
  
  // Click handler for grid items
  $('.masonry-grid').on('click', '.grid-item', function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const $item = $(this);
    const imageSrc = $item.data('image-src');
    const seriesId = $item.data('series-id');
    const seriesTitle = $item.data('series-title');
    
    // Set modal content
    modalImage.attr('src', imageSrc);
    modalImage.attr('alt', seriesTitle);
    modalTitle.text(seriesTitle);
    modalLink.attr('href', (window.baseUrl || '/') + 'serie.html?id=' + seriesId);
    
    // Open modal
    openImageModal();
  });
  
  // Close modal on overlay click
  $('.modal-overlay').on('click', function() {
    closeImageModal();
  });
  
  // Close modal on close button click
  $('.modal-close').on('click', function() {
    closeImageModal();
  });
  
  // Close modal on ESC key
  $(document).on('keydown', function(e) {
    if (e.key === 'Escape' && modal.hasClass('active')) {
      closeImageModal();
    }
  });
  
  // Prevent modal content click from closing the modal
  $('.modal-content').on('click', function(e) {
    e.stopPropagation();
  });
}

function openImageModal() {
  const modal = $('#image-modal');
  modal.addClass('active');
  // Prevent body scroll when modal is open
  $('body').css('overflow', 'hidden');
}

function closeImageModal() {
  const modal = $('#image-modal');
  modal.removeClass('active');
  // Re-enable body scroll
  $('body').css('overflow', '');
}

// ===== Theme Toggle Functions =====
function initializeTheme() {
  // Check for saved theme preference in localStorage
  const savedTheme = localStorage.getItem('theme');
  
  if (savedTheme) {
    // Apply saved theme
    document.documentElement.setAttribute('data-theme', savedTheme);
  } else {
    // Default to light mode
    document.documentElement.setAttribute('data-theme', 'light');
  }
  
  // Add click handler for theme toggle button
  $(document).on('click', '#theme-toggle', function(e) {
    e.preventDefault();
    e.stopPropagation();
    toggleTheme();
  });
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  // Apply new theme
  document.documentElement.setAttribute('data-theme', newTheme);
  
  // Save preference to localStorage
  localStorage.setItem('theme', newTheme);
}
