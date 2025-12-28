// src/App.js
import React, { useRef, useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { Document, Page, pdfjs } from 'react-pdf';
import SignatureCanvas from 'react-signature-canvas';
import './App.css';


pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;


function App() {
  const [pdfFile, setPdfFile] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [signatures, setSignatures] = useState({});
  const [signingMode, setSigningMode] = useState(false);
  const [pageDimensions, setPageDimensions] = useState({});
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const sigCanvas = useRef();
  const pageContainerRef = useRef();
  const signatureOverlayRef = useRef();

  const handleFile = (e) => {
    setPdfFile(e.target.files[0]);
    setCurrentPage(1);
    setSignatures({});
    setSigningMode(false);
    setZoom(1);
  };

  const handlePageLoadSuccess = ({ width, height }) => {
    setPageDimensions(prev => ({
      ...prev,
      [currentPage]: { width, height }
    }));
  };

  const handleSaveSignature = () => {
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      const canvas = sigCanvas.current.getCanvas();
      const newSignatures = { ...signatures };
      newSignatures[currentPage] = {
        data: canvas.toDataURL('image/png'),
        x: 50,
        y: 50,
        width: 150,
        height: 75,
      };
      setSignatures(newSignatures);
      sigCanvas.current.clear();
      setSigningMode(false);
    } else {
      alert('Draw your signature first!');
    }
  };

  const handleClearSignature = () => {
    if (sigCanvas.current) {
      sigCanvas.current.clear();
    }
  };

  const handleClearPageSignature = () => {
    const newSignatures = { ...signatures };
    delete newSignatures[currentPage];
    setSignatures(newSignatures);
    sigCanvas.current?.clear();
  };

  const handleMouseDown = (e) => {
    if (!signatures[currentPage]) return;
    // Only drag if not clicking on resize or delete
    if (e.target.classList.contains('resize-handle') || e.target.classList.contains('delete-signature-btn')) return;
    setIsDragging(true);
    const rect = pageContainerRef.current.getBoundingClientRect();
    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;
    const sig = signatures[currentPage];
    setDragOffset({
      startX,
      startY,
      initX: sig.x,
      initY: sig.y,
    });
  };
  // Resize handlers
  const handleResizeMouseDown = (e) => {
    e.stopPropagation();
    setIsResizing(true);
    const rect = pageContainerRef.current.getBoundingClientRect();
    setResizeStart({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      width: signatures[currentPage].width,
      height: signatures[currentPage].height,
    });
  };

  const handleResizeMouseMove = (e) => {
    if (!isResizing || !signatures[currentPage]) return;
    const rect = pageContainerRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    const deltaX = currentX - resizeStart.x;
    const deltaY = currentY - resizeStart.y;
    const minWidth = 50;
    const minHeight = 25;
    const newWidth = Math.max(minWidth, resizeStart.width + deltaX);
    const newHeight = Math.max(minHeight, resizeStart.height + deltaY);
    const newSignatures = { ...signatures };
    newSignatures[currentPage] = {
      ...newSignatures[currentPage],
      width: newWidth,
      height: newHeight,
    };
    setSignatures(newSignatures);
  };

  const handleResizeMouseUp = () => {
    setIsResizing(false);
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !signatures[currentPage]) return;
    
    const rect = pageContainerRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    
    const deltaX = currentX - dragOffset.startX;
    const deltaY = currentY - dragOffset.startY;
    
    const newX = Math.max(0, dragOffset.initX + deltaX);
    const newY = Math.max(0, dragOffset.initY + deltaY);
    
    const newSignatures = { ...signatures };
    newSignatures[currentPage] = {
      ...newSignatures[currentPage],
      x: newX,
      y: newY,
    };
    setSignatures(newSignatures);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e) => {
    if (!signatures[currentPage]) return;
    setIsDragging(true);
    const rect = pageContainerRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const startX = touch.clientX - rect.left;
    const startY = touch.clientY - rect.top;
    const sig = signatures[currentPage];
    setDragOffset({
      startX,
      startY,
      initX: sig.x,
      initY: sig.y,
    });
  };

  const handleTouchMove = (e) => {
    if (!isDragging || !signatures[currentPage]) return;
    
    const rect = pageContainerRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const currentX = touch.clientX - rect.left;
    const currentY = touch.clientY - rect.top;
    
    const deltaX = currentX - dragOffset.startX;
    const deltaY = currentY - dragOffset.startY;
    
    const newX = Math.max(0, dragOffset.initX + deltaX);
    const newY = Math.max(0, dragOffset.initY + deltaY);
    
    const newSignatures = { ...signatures };
    newSignatures[currentPage] = {
      ...newSignatures[currentPage],
      x: newX,
      y: newY,
    };
    setSignatures(newSignatures);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleExport = async () => {
    if (!pdfFile || Object.keys(signatures).length === 0) {
      alert('Select a PDF and add at least one signature!');
      return;
    }

    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);

      // Add signatures to all pages that have them
      for (const [pageNum, sigObj] of Object.entries(signatures)) {
        const pageIndex = parseInt(pageNum) - 1;
        if (pageIndex >= 0 && pageIndex < pdfDoc.getPageCount()) {
          const page = pdfDoc.getPage(pageIndex);
          const pngImage = await pdfDoc.embedPng(sigObj.data);
          const pageHeight = page.getHeight();
          const pageWidth = page.getWidth();

          // Use both rendered width and height for scaling
          const displayWidth = pageDimensions[pageNum]?.width || 600;
          const displayHeight = pageDimensions[pageNum]?.height || 800;
          const scaleX = pageWidth / displayWidth;
          const scaleY = pageHeight / displayHeight;

          page.drawImage(pngImage, {
            x: sigObj.x * scaleX,
            y: pageHeight - ((sigObj.y + (sigObj.height || 75)) * scaleY),
            width: (sigObj.width || 150) * scaleX,
            height: (sigObj.height || 75) * scaleY,
          });
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'signed.pdf';
      link.click();
    } catch (error) {
      alert('Error exporting PDF: ' + error.message);
    }
  };

  const pageWidth = typeof window !== 'undefined' ? Math.min(window.innerWidth - 40, 600) : 600;

  return (
    <div className="app-container">
      <div className={`app-header ${pdfFile ? 'hidden' : ''}`}>
        <h1 className="app-title">🪽 AngelsDoc</h1>
        <p className="app-subtitle">Sign PDFs beautifully</p>
      </div>

      {!pdfFile ? (
        <div className="onboarding-screen">
          <div className="onboarding-content">
            <div className="onboarding-icon">📋</div>
            <h2>Welcome to DocSign</h2>
            <p>Upload a PDF to get started with signing</p>
            <label className="file-input-label">
              <input 
                type="file" 
                accept="application/pdf" 
                onChange={handleFile}
                className="file-input-hidden"
              />
              <span className="file-button">Choose PDF File</span>
            </label>
          </div>
        </div>
      ) : (
        <div className="document-screen">
          <div className="pdf-container">
            <div className="pdf-toolbar">
              <div className="toolbar-left">
                <button 
                  onClick={() => {
                    setPdfFile(null);
                    setSignatures({});
                    setCurrentPage(1);
                    setZoom(1);
                    setMenuOpen(false);
                  }}
                  className="toolbar-button"
                  title="Back to Home"
                >
                  ←
                </button>
                <button 
                  onClick={() => setZoom(Math.max(0.5, zoom - 0.2))}
                  className="toolbar-button"
                  title="Zoom Out"
                >
                  −
                </button>
                <span className="zoom-display">{Math.round(zoom * 100)}%</span>
                <button 
                  onClick={() => setZoom(Math.min(2, zoom + 0.2))}
                  className="toolbar-button"
                  title="Zoom In"
                >
                  +
                </button>
                <button 
                  onClick={() => setZoom(1)}
                  className="toolbar-button"
                  title="Reset"
                >
                  ↻
                </button>
              </div>
              <div className="toolbar-center">
                <span className="page-counter"><span className="current-page">{currentPage}</span> of {numPages}</span>
              </div>
              <div className="toolbar-right">
                <button 
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage <= 1}
                  className="toolbar-button"
                >
                  ←
                </button>
                <button 
                  onClick={() => setCurrentPage(Math.min(numPages, currentPage + 1))}
                  disabled={currentPage >= numPages}
                  className="toolbar-button"
                >
                  →
                </button>
              </div>
            </div>

            <Document
              file={pdfFile}
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
              loading={<div className="pdf-loading">📖 Loading document...</div>}
              error={<div className="pdf-error">⚠️ Error loading PDF</div>}
            >
              <div 
                ref={pageContainerRef}
                className="pdf-viewer"
                onMouseDown={handleMouseDown}
                onMouseMove={e => {
                  handleMouseMove(e);
                  handleResizeMouseMove(e);
                }}
                onMouseUp={e => {
                  handleMouseUp(e);
                  handleResizeMouseUp(e);
                }}
                onMouseLeave={e => {
                  handleMouseUp(e);
                  handleResizeMouseUp(e);
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <div className="pdf-wrapper" style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
                  <Page 
                    pageNumber={currentPage} 
                    width={pageWidth}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    onLoadSuccess={handlePageLoadSuccess}
                  />
                  
                  {/* Signature Overlay */}
                  {signatures[currentPage] && (
                    <div
                      ref={signatureOverlayRef}
                      className="signature-overlay"
                      style={{
                        left: `${signatures[currentPage].x}px`,
                        top: `${signatures[currentPage].y}px`,
                        width: `${signatures[currentPage].width || 150}px`,
                        height: `${signatures[currentPage].height || 75}px`,
                        cursor: isDragging ? 'grabbing' : isResizing ? 'nwse-resize' : 'grab',
                      }}
                    >
                      <img 
                        src={signatures[currentPage].data}
                        alt="Signature"
                        className="overlay-image"
                        draggable={false}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                      <button
                        className="delete-signature-btn"
                        title="Delete Signature"
                        onClick={handleClearPageSignature}
                        tabIndex={-1}
                        type="button"
                      >
                        ✕
                      </button>
                      <div
                        className="resize-handle"
                        title="Resize Signature"
                        onMouseDown={handleResizeMouseDown}
                        style={{ position: 'absolute', right: 0, bottom: 0 }}
                      />
                      <div className="drag-hint">↔ Drag</div>
                      <button
                        className="move-signature-btn"
                        title="Move to Next Page"
                        onClick={() => {
                          if (currentPage < numPages) {
                            const newSignatures = { ...signatures };
                            newSignatures[currentPage + 1] = {
                              ...newSignatures[currentPage],
                            };
                            delete newSignatures[currentPage];
                            setSignatures(newSignatures);
                            setCurrentPage(currentPage + 1);
                          }
                        }}
                        tabIndex={-1}
                        type="button"
                        disabled={currentPage >= numPages}
                      >
                        ➡
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </Document>
            
            {/* Signature Drawing Canvas - Hidden by default */}
            {signingMode && (
              <div className="signature-drawing-overlay">
                <div className="signature-drawing-container">
                  <h3>Draw Your Signature</h3>
                  <SignatureCanvas
                    ref={sigCanvas}
                    penColor="black"
                    canvasProps={{
                      width: 500,
                      height: 200,
                      className: 'signature-canvas'
                    }}
                  />
                  <div className="signature-button-group">
                    <button 
                      onClick={handleClearSignature}
                      className="signature-action-btn clear"
                    >
                      Clear
                    </button>
                    <button 
                      onClick={handleSaveSignature}
                      className="signature-action-btn save"
                    >
                      Save Signature
                    </button>
                    <button 
                      onClick={() => setSigningMode(false)}
                      className="signature-action-btn cancel"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Floating Sign Button */}
            {!signingMode && (
              <button 
                onClick={() => setSigningMode(true)}
                className={`floating-sign-btn ${menuOpen ? 'hidden' : ''}`}
              >
                ✎ Sign
              </button>
            )}
            
            {/* Hamburger Menu Button */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="hamburger-menu-btn"
            >
              <span className={`hamburger-line ${menuOpen ? 'active' : ''}`}></span>
              <span className={`hamburger-line ${menuOpen ? 'active' : ''}`}></span>
              <span className={`hamburger-line ${menuOpen ? 'active' : ''}`}></span>
            </button>
          </div>



          {/* Floating Export/New Button Group */}
          <div className={`floating-action-group ${menuOpen ? 'visible' : 'hidden'}`}>
            <button 
              onClick={handleExport}
              disabled={Object.keys(signatures).length === 0}
              className="export-btn primary"
              title="Export Signed PDF"
            >
              ⬇ Export
            </button>
            <button 
              onClick={() => {
                setPdfFile(null);
                setSignatures({});
                setCurrentPage(1);
                setZoom(1);
                setMenuOpen(false);
              }}
              className="export-btn secondary"
              title="Start New PDF"
            >
              ↺ New
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;