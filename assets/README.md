# Assets Directory

This directory is reserved for static media assets such as company logos, slide backgrounds, or custom icons if needed.

The application is intentionally architected to be completely zero-dependency for audio and iconography:
- **Audio Sound Effects**: Built with pure browser-native Web Audio API frequency synthesis (clicks, countdown ticks, correct chords, wrong buzzers, fanfare). This avoids missing sound file 404s and ensures fast, resilient offline performance on GitHub Pages.
- **Icons**: Sourced from Bootstrap Icons via CDN.
- **Fonts**: Sourced from Google Fonts (Outfit & Inter) via CDN.
- **Celebration Effects**: Rendered in canvas using `canvas-confetti`.
