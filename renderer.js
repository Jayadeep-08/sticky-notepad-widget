let isDraggable = false;
let pageIndex = 0;
let pages = [''];
let currentFilePath = null;
let isModified = false;

// Handle drag toggle from main process
window.electronAPI.onToggleDrag((event, canDrag) => {
  isDraggable = canDrag;
  const container = document.querySelector('.container');
  if (container) {
    if (canDrag) {
      container.style.webkitAppRegion = 'drag';
      container.classList.add('draggable');
    } else {
      container.style.webkitAppRegion = 'no-drag';
      container.classList.remove('draggable');
    }
    
    // Update cursor to indicate draggable state
    container.style.cursor = canDrag ? 'move' : 'default';
  }
  
  // Update the visual indicator
  updateDragIndicator(canDrag);
  
  // Make textarea non-draggable always
  const textarea = document.getElementById('note');
  if (textarea) {
    textarea.style.webkitAppRegion = 'no-drag';
  }
  
  // Make buttons non-draggable
  const buttons = document.querySelectorAll('button');
  buttons.forEach(btn => {
    btn.style.webkitAppRegion = 'no-drag';
  });
});

function updateDragIndicator(canDrag) {
  const indicator = document.querySelector('.drag-indicator');
  if (indicator) {
    indicator.textContent = canDrag ? '🔓' : '🔒';
    indicator.title = canDrag ? 'Position Unlocked - Right-click to lock' : 'Position Locked - Right-click to unlock';
  }
}

function renderPage() {
  document.getElementById('page-number').innerText = `Page ${pageIndex + 1}`;
  document.getElementById('note').value = pages[pageIndex] || '';
  updateTitle();
}

function updateTitle() {
  const title = document.querySelector('.title');
  if (title) {
    const fileName = currentFilePath ? 
      currentFilePath.split(/[\\/]/).pop() : 
      'Untitled';
    title.textContent = `${fileName}${isModified ? ' *' : ''}`;
  }
}

function markAsModified() {
  if (!isModified) {
    isModified = true;
    updateTitle();
  }
}

function markAsSaved() {
  isModified = false;
  updateTitle();
}

// Page navigation
document.getElementById('prev-btn').addEventListener('click', () => {
  if (pageIndex > 0) {
    pages[pageIndex] = document.getElementById('note').value;
    pageIndex--;
    renderPage();
  }
});

document.getElementById('next-btn').addEventListener('click', () => {
  pages[pageIndex] = document.getElementById('note').value;
  pageIndex++;
  if (!pages[pageIndex]) pages[pageIndex] = '';
  renderPage();
});

// File operations
document.getElementById('open-btn').addEventListener('click', async () => {
  const button = document.getElementById('open-btn');
  button.disabled = true;
  button.textContent = 'Opening...';
  
  try {
    const result = await window.electronAPI.openFile();
    
    if (result.success) {
      // Parse content into pages (split by form feed or double newline)
      const content = result.content;
      pages = content.split('\f').map(page => page.trim());
      if (pages.length === 0) pages = [''];
      
      pageIndex = 0;
      currentFilePath = result.filePath;
      markAsSaved();
      renderPage();
      
      // Show success message
      showMessage('File opened successfully!', 'success');
    } else if (!result.canceled) {
      showMessage('Error opening file: ' + result.error, 'error');
    }
  } catch (error) {
    showMessage('Error opening file: ' + error.message, 'error');
  } finally {
    button.disabled = false;
    button.textContent = 'Open';
  }
});

document.getElementById('save-btn').addEventListener('click', async () => {
  const button = document.getElementById('save-btn');
  button.disabled = true;
  button.textContent = 'Saving...';
  
  try {
    // Update current page content
    pages[pageIndex] = document.getElementById('note').value;
    
    // Join all pages with form feed character
    const content = pages.join('\f');
    
    const result = await window.electronAPI.saveFile(content);
    
    if (result.success) {
      currentFilePath = result.filePath;
      markAsSaved();
      showMessage('File saved successfully!', 'success');
    } else if (!result.canceled) {
      showMessage('Error saving file: ' + result.error, 'error');
    }
  } catch (error) {
    showMessage('Error saving file: ' + error.message, 'error');
  } finally {
    button.disabled = false;
    button.textContent = 'Save';
  }
});

// Track text changes
document.getElementById('note').addEventListener('input', () => {
  markAsModified();
});

// Message system
function showMessage(message, type = 'info') {
  const messageEl = document.createElement('div');
  messageEl.className = `message ${type}`;
  messageEl.textContent = message;
  
  document.body.appendChild(messageEl);
  
  // Remove message after 3 seconds
  setTimeout(() => {
    if (messageEl.parentNode) {
      messageEl.remove();
    }
  }, 3000);
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  updateDragIndicator(false);

  try {
    const result = await window.electronAPI.openFile();
    
    if (result.success) {
      pages = result.content.split('\f').map(page => page.trim());
      if (pages.length === 0) pages = [''];
      pageIndex = 0;
      markAsSaved();
      renderPage();
    } else {
      showMessage('Could not load today\'s note', 'error');
      pages = [''];
      pageIndex = 0;
      renderPage();
    }
  } catch (error) {
    showMessage('Error: ' + error.message, 'error');
    pages = [''];
    pageIndex = 0;
    renderPage();
  }

  const autoLaunchToggle = document.getElementById('autoLaunchCheckbox');
  if (autoLaunchToggle) {
    autoLaunchToggle.addEventListener('change', async (e) => {
      const checked = e.target.checked;
      const result = await window.electronAPI.setAutoLaunch(checked);
      if (!result.success) alert('Failed: ' + result.error);
    });

    window.electronAPI.getAutoLaunchStatus().then((enabled) => {
      autoLaunchToggle.checked = enabled;
    });
  }
});

