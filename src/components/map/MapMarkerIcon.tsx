import L from 'leaflet'
import { EventCategory } from '@/types'

export interface MarkerIconOptions {
  category: EventCategory
  color: string
  icon: string
  size: 'small' | 'medium' | 'large'
  isHovered?: boolean
  isFeatured?: boolean
}

const sizeMap = {
  small: { width: 30, height: 30, fontSize: 12 },
  medium: { width: 40, height: 40, fontSize: 14 },
  large: { width: 50, height: 50, fontSize: 16 },
}

export function createIcon({
  category,
  color,
  icon,
  size,
  isHovered = false,
  isFeatured = false
}: MarkerIconOptions): L.DivIcon {
  const { width, height, fontSize } = sizeMap[size]
  const scale = isHovered ? 1.1 : 1
  const glowIntensity = isFeatured ? '0 0 20px rgba(255, 255, 255, 0.8)' : ''

  const html = `
    <div class="custom-marker" style="
      width: ${width}px;
      height: ${height}px;
      background: ${color};
      border: 3px solid white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: ${fontSize}px;
      transform: scale(${scale});
      transition: all 0.2s ease;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4), ${glowIntensity};
      cursor: pointer;
      position: relative;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
    ">
      <span style="
        color: white;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
        filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.8));
      ">${icon}</span>
      
      ${isFeatured ? `
        <div style="
          position: absolute;
          top: -2px;
          right: -2px;
          width: 12px;
          height: 12px;
          background: #ff4444;
          border: 2px solid white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 8px;
        ">⭐</div>
      ` : ''}
      
      ${isHovered ? `
        <div style="
          position: absolute;
          top: -${height + 10}px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.9);
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 10px;
          white-space: nowrap;
          pointer-events: none;
          backdrop-filter: blur(10px);
        ">${category.charAt(0).toUpperCase() + category.slice(1)}</div>
      ` : ''}
    </div>
  `

  return L.divIcon({
    html,
    className: `custom-marker-${category}`,
    iconSize: L.point(width * scale, height * scale, true),
    iconAnchor: L.point((width * scale) / 2, (height * scale) / 2, true),
  })
}

// Pulse animation for featured events
export function createPulsingIcon(options: MarkerIconOptions): L.DivIcon {
  const { width, height, fontSize } = sizeMap[options.size]
  const { color, icon, category } = options

  const html = `
    <div class="pulsing-marker" style="
      position: relative;
      width: ${width}px;
      height: ${height}px;
    ">
      <!-- Pulsing ring -->
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: ${width * 1.5}px;
        height: ${width * 1.5}px;
        background: ${color};
        border-radius: 50%;
        opacity: 0.3;
        animation: pulse 2s infinite;
      "></div>
      
      <!-- Main marker -->
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: ${width}px;
        height: ${height}px;
        background: ${color};
        border: 3px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${fontSize}px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        cursor: pointer;
        z-index: 2;
      ">
        <span style="
          color: white;
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
        ">${icon}</span>
      </div>
      
      <style>
        @keyframes pulse {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.3;
          }
          70% {
            transform: translate(-50%, -50%) scale(1.5);
            opacity: 0;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.5);
            opacity: 0;
          }
        }
      </style>
    </div>
  `

  return L.divIcon({
    html,
    className: `pulsing-marker-${category}`,
    iconSize: L.point(width * 1.5, height * 1.5, true),
    iconAnchor: L.point((width * 1.5) / 2, (height * 1.5) / 2, true),
  })
}