# Self-Hosted Fonts

This directory contains custom fonts for the Local Effort website.

## Required Font Files

### National Park Typeface
Download from: https://nationalparktypeface.com/

Place these files in this folder:
- `NationalPark-Regular.woff2` (and .woff)
- `NationalPark-Medium.woff2` (and .woff)
- `NationalPark-Bold.woff2` (and .woff)
- `NationalPark-Heavy.woff2` (and .woff)

### Office Code Pro
Download from: https://open-foundry.com/fonts/office-code-pro
Or GitHub: https://github.com/nicoooo972/Office-Code-Pro

Place these files in this folder:
- `OfficeCodePro-Light.woff2` (and .woff)
- `OfficeCodePro-Regular.woff2` (and .woff)
- `OfficeCodePro-Medium.woff2` (and .woff)
- `OfficeCodePro-Bold.woff2` (and .woff)

## Converting Fonts

If you only have .ttf or .otf files, convert them to .woff2 using:
- https://cloudconvert.com/ttf-to-woff2
- https://transfonter.org/

## Usage

The fonts are loaded via `/public/fonts/fonts.css` which is imported in the main CSS.

### Font Families:
- `'National Park'` - Used for the logo text
- `'Office Code Pro'` - Used for headers, navigation, and titles
- `'Yomogi'` - Available for decorative use (loaded from Google Fonts)
