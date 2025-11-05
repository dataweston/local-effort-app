/**
 * MagicUI Components Demo
 *
 * This file shows examples of what you can create with MagicUI MCP.
 * Once the MCP server is running in Claude Desktop, you can ask for:
 *
 * ANIMATIONS:
 * - Blur fade animations
 * - Typing effects
 * - Number tickers
 * - Word rotation effects
 *
 * COMPONENTS:
 * - Marquees (logo scrollers)
 * - Bento grids
 * - Animated beams
 * - Globe visualizations
 *
 * EFFECTS:
 * - Shine borders
 * - Gradient animations
 * - Particle effects
 * - Background patterns
 *
 * EXAMPLE USAGE IN CLAUDE DESKTOP:
 *
 * You: "Add a marquee of logos"
 * Claude: [Uses MagicUI MCP to fetch the Marquee component code]
 *
 * You: "Create a hero section with blur fade animation"
 * Claude: [Uses MagicUI MCP to fetch BlurFade component and generates code]
 *
 * You: "Add a dot pattern background"
 * Claude: [Uses MagicUI MCP to fetch DotPattern component]
 */

// Example component you might generate:
export default function HeroSection() {
  return (
    <div className="relative flex h-screen w-full items-center justify-center">
      {/* You would ask Claude to "Add a dot pattern background" */}
      {/* You would ask Claude to "Add blur fade text animation" */}
      <h1 className="text-6xl font-bold">
        Welcome to MagicUI
      </h1>
    </div>
  )
}
