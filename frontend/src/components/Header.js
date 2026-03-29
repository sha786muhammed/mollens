function Header() {
  return (
    <header className="app-header navbar">
      <div className="header-left">
        <h2 className="brand-title">
          <span className="brand-title-mol">Mol</span>
          <span className="brand-title-lens">Lens</span>
        </h2>
        <nav className="main-nav">
          <a className="nav-link" href="/">Home</a>
          <a className="nav-link" href="/workspace">Workspace</a>
          <a className="nav-link" href="https://github.com" target="_blank" rel="noreferrer">GitHub</a>
        </nav>
      </div>
      <div className="header-actions">
        <button type="button" className="btn-outline header-back-btn" onClick={() => window.history.back()}>
          Back
        </button>
      </div>
    </header>
  );
}

export default Header;
