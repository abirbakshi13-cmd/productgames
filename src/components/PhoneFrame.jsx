import './PhoneFrame.css';
import '../styles/receipts-theme.css';

/**
 * Wraps a screen in a simulated phone. Wider than 500px: centers a
 * 390x844 frame on a neutral page. 500px and under (a real phone):
 * full width/height, no frame. No dependencies other than its own CSS,
 * so Person A can wrap the real App in this unchanged at integration.
 */
export default function PhoneFrame({ children }) {
  return (
    <div className="phone-frame-page">
      <div className="phone-frame">
        <div className="phone-frame-screen">{children}</div>
      </div>
    </div>
  );
}
