/**
 * RinaWarp Terminal Pro - Renderer Entry Point
 *
 * Keep the boot path explicit: index wires bootstrap, bootstrap owns
 * DOM readiness and startup orchestration, and the production renderer
 * provides the current implementation.
 */

import './index.css'
import { initRenderer } from './bootstrap/initRenderer.js'

void initRenderer()
