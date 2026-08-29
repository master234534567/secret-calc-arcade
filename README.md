# Calc

Create a modern, clean, and fully responsive web application that looks and functions like a standard, minimalist online calculator on the surface, but serves as a secret unblocked games portal.

### 1. The Calculator Interface (Default View)

- Design a sleek, fully functional calculator interface (similar to iOS or Google Calculator) with buttons for numbers (0-9), basic operations (+, -, *, /), decimal, clear (C), and equals (=).

- Include a display screen at the top that shows the current input and calculation results.

- Implement working calculator logic so users can do real math if they want to.

### 2. The Secret Bypass Feature

- Watch the calculator's input or display state. 

- If the user types "1111" and presses the equals button (=) (or hits Enter on their keyboard), trigger a smooth transition (like a fade or slide effect) that hides the calculator and reveals the "Games Portal" view.

- Provide a subtle way to return to the calculator (e.g., a discreet "Lock" or "Reset" icon in the corner of the games page).

### 3. The Unblocked Games Portal View

- Once unlocked, display a dashboard/arcade layout featuring a grid of popular web games.

- Include at least 4-6 placeholder game cards (e.g., Retro Bowl, Slope, 2048, Tunnel Rush). Each card should have a game title, a thumbnail image, and a "Play" button.

- Clicking a game should open an immersive full-screen or large modal view where the game is loaded via an embedded iframe (use safe, publicly available embed URLs or placeholder iframe sources for games).

- Ensure the layout is mobile-friendly, uses dark mode styling (e.g., Tailwind CSS with slate/zinc colors), and looks clean and professional.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/dca52c15-0252-4536-9509-5f1eefc9e526).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
