import React from 'react';

export const Footer = React.memo(() => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <p className="disclaimer">
          This site is not affiliated with Y Combinator or Slashdot. All rights reserved by their respective copyright holders.
        </p>
      </div>
    </footer>
  );
});