/**
 * Map View - Shows all locations (washrooms, gates, janitor closets) on a map with non-overlapping labels
 */

import {
  Box,
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Tooltip,
} from '@mui/material'
import { useState, useEffect, useRef, useMemo } from 'react'
import { loadBathroomCatalog, loadGates, loadJanitorClosets, BathroomCatalogItem, GateItem, JanitorClosetItem } from '../../services/dataService'

interface Point {
  x: number
  y: number
  id: string
  type: 'washroom' | 'gate' | 'janitor_closet'
  label: string
}

interface LabelBox {
  x: number
  y: number
  width: number
  height: number
  id: string
}

function MapView() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [bathrooms, setBathrooms] = useState<BathroomCatalogItem[]>([])
  const [gates, setGates] = useState<GateItem[]>([])
  const [closets, setClosets] = useState<JanitorClosetItem[]>([])
  const [showWashrooms, setShowWashrooms] = useState(true)
  const [showGates, setShowGates] = useState(true)
  const [showJanitorClosets, setShowJanitorClosets] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      const [bathroomData, gateData, closetData] = await Promise.all([
        loadBathroomCatalog(),
        loadGates(),
        loadJanitorClosets(),
      ])
      setBathrooms(bathroomData)
      setGates(gateData)
      setClosets(closetData)
      setLoading(false)
    }
    loadData()
  }, [])

  // Convert all locations to points
  const allPoints = useMemo(() => {
    const points: Point[] = []
    
    if (showWashrooms) {
      bathrooms.forEach((bathroom) => {
        points.push({
          x: bathroom.coordinates.x,
          y: bathroom.coordinates.y,
          id: bathroom.id,
          type: 'washroom',
          label: bathroom.id,
        })
      })
    }
    
    if (showGates) {
      gates.forEach((gate) => {
        points.push({
          x: gate.coordinates.x,
          y: gate.coordinates.y,
          id: gate.id,
          type: 'gate',
          label: gate.id,
        })
      })
    }
    
    if (showJanitorClosets) {
      closets.forEach((closet) => {
        points.push({
          x: closet.coordinates.x,
          y: closet.coordinates.y,
          id: closet.id,
          type: 'janitor_closet',
          label: closet.id,
        })
      })
    }
    
    return points
  }, [bathrooms, gates, closets, showWashrooms, showGates, showJanitorClosets])

  // Calculate bounds
  const bounds = useMemo(() => {
    if (allPoints.length === 0) {
      return { minX: 0, maxX: 1000, minY: 0, maxY: 1000 }
    }
    
    const xs = allPoints.map((p) => p.x)
    const ys = allPoints.map((p) => p.y)
    
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    
    // Add padding
    const paddingX = (maxX - minX) * 0.1
    const paddingY = (maxY - minY) * 0.1
    
    return {
      minX: minX - paddingX,
      maxX: maxX + paddingX,
      minY: minY - paddingY,
      maxY: maxY + paddingY,
    }
  }, [allPoints])

  // Label collision detection and positioning
  const getLabelPositions = (points: Point[], canvasWidth: number, canvasHeight: number): Map<string, LabelBox> => {
    const labelMap = new Map<string, LabelBox>()
    const labelHeight = 20
    const labelPadding = 4
    const minDistance = 25 // Minimum distance between labels
    
    if (points.length === 0) return labelMap
    
    // Scale points to canvas coordinates
    const scaleX = canvasWidth / (bounds.maxX - bounds.minX)
    const scaleY = canvasHeight / (bounds.maxY - bounds.minY)
    
    const scaledPoints = points.map((p) => ({
      ...p,
      canvasX: (p.x - bounds.minX) * scaleX,
      canvasY: (p.y - bounds.minY) * scaleY,
    }))
    
    // Sort by priority (gates first, then closets, then washrooms)
    const priority = { gate: 0, janitor_closet: 1, washroom: 2 }
    scaledPoints.sort((a, b) => priority[a.type] - priority[b.type])
    
    // Try different label positions for each point (more positions for better coverage)
    const labelOffsets = [
      { x: 0, y: -28 }, // Above
      { x: 18, y: 0 },  // Right
      { x: -18, y: 0 }, // Left
      { x: 0, y: 18 },  // Below
      { x: 18, y: -28 }, // Above-right
      { x: -18, y: -28 }, // Above-left
      { x: 18, y: 18 }, // Below-right
      { x: -18, y: 18 }, // Below-left
      { x: 0, y: -40 }, // Further above
      { x: 30, y: 0 },  // Further right
      { x: -30, y: 0 }, // Further left
    ]
    
    const checkCollision = (box: LabelBox, existingBoxes: Map<string, LabelBox>): boolean => {
      for (const existingLabel of existingBoxes.values()) {
        // Check if boxes overlap
        const boxesOverlap =
          box.x < existingLabel.x + existingLabel.width &&
          box.x + box.width > existingLabel.x &&
          box.y < existingLabel.y + existingLabel.height &&
          box.y + box.height > existingLabel.y
        
        if (boxesOverlap) {
          return true
        }
        
        // Check minimum distance between centers
        const centerX1 = box.x + box.width / 2
        const centerY1 = box.y + box.height / 2
        const centerX2 = existingLabel.x + existingLabel.width / 2
        const centerY2 = existingLabel.y + existingLabel.height / 2
        const distance = Math.sqrt(Math.pow(centerX1 - centerX2, 2) + Math.pow(centerY1 - centerY2, 2))
        
        if (distance < minDistance) {
          return true
        }
      }
      return false
    }
    
    scaledPoints.forEach((point) => {
      const labelWidth = Math.max(point.label.length * 7 + labelPadding * 2, 40)
      
      // Try each offset position
      let placed = false
      for (const offset of labelOffsets) {
        const labelX = point.canvasX + offset.x - labelWidth / 2
        const labelY = point.canvasY + offset.y
        const labelBox: LabelBox = {
          x: labelX,
          y: labelY,
          width: labelWidth,
          height: labelHeight,
          id: point.id,
        }
        
        // Check if label is within canvas bounds (with some margin)
        const margin = 5
        const withinBounds =
          labelX >= margin &&
          labelX + labelWidth <= canvasWidth - margin &&
          labelY >= margin &&
          labelY + labelHeight <= canvasHeight - margin
        
        if (!withinBounds) continue
        
        // Check collision with existing labels
        if (!checkCollision(labelBox, labelMap)) {
          labelMap.set(point.id, labelBox)
          placed = true
          break
        }
      }
      
      // If no position found, use default position (may overlap)
      if (!placed) {
        labelMap.set(point.id, {
          x: point.canvasX - labelWidth / 2,
          y: point.canvasY - 28,
          width: labelWidth,
          height: labelHeight,
          id: point.id,
        })
      }
    })
    
    return labelMap
  }

  // Draw map
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || loading || allPoints.length === 0) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const canvasWidth = canvas.width
    const canvasHeight = canvas.height
    
    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)
    
    // Set background
    ctx.fillStyle = '#f5f5f5'
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)
    
    // Scale points to canvas
    const scaleX = canvasWidth / (bounds.maxX - bounds.minX)
    const scaleY = canvasHeight / (bounds.maxY - bounds.minY)
    
    // Get label positions
    const labelPositions = getLabelPositions(allPoints, canvasWidth, canvasHeight)
    
    // Draw points and labels
    allPoints.forEach((point) => {
      const canvasX = (point.x - bounds.minX) * scaleX
      const canvasY = (point.y - bounds.minY) * scaleY
      
      // Draw point
      ctx.beginPath()
      ctx.arc(canvasX, canvasY, 4, 0, Math.PI * 2)
      
      // Color by type
      if (point.type === 'washroom') {
        ctx.fillStyle = '#1976d2' // Blue
      } else if (point.type === 'gate') {
        ctx.fillStyle = '#2e7d32' // Green
      } else {
        ctx.fillStyle = '#ed6c02' // Orange
      }
      
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.stroke()
      
      // Draw label
      const labelBox = labelPositions.get(point.id)
      if (labelBox) {
        // Draw label background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
        ctx.fillRect(labelBox.x, labelBox.y, labelBox.width, labelBox.height)
        ctx.strokeStyle = '#ccc'
        ctx.lineWidth = 1
        ctx.strokeRect(labelBox.x, labelBox.y, labelBox.width, labelBox.height)
        
        // Draw label text
        ctx.fillStyle = '#333'
        ctx.font = '11px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(point.label, labelBox.x + labelBox.width / 2, labelBox.y + labelBox.height / 2)
        
        // Draw line from point to label (only if label is offset)
        const labelCenterX = labelBox.x + labelBox.width / 2
        const labelCenterY = labelBox.y + labelBox.height / 2
        const distance = Math.sqrt(Math.pow(canvasX - labelCenterX, 2) + Math.pow(canvasY - labelCenterY, 2))
        
        if (distance > 10) {
          ctx.strokeStyle = '#999'
          ctx.lineWidth = 1
          ctx.setLineDash([2, 2])
          ctx.beginPath()
          ctx.moveTo(canvasX, canvasY)
          ctx.lineTo(labelCenterX, labelCenterY)
          ctx.stroke()
          ctx.setLineDash([])
        }
      }
    })
  }, [allPoints, bounds, loading, showWashrooms, showGates, showJanitorClosets])

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
            Loading map data...
          </Typography>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Location Map
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControlLabel
              control={
                <Checkbox checked={showWashrooms} onChange={(e) => setShowWashrooms(e.target.checked)} />
              }
              label="Washrooms"
            />
            <FormControlLabel
              control={<Checkbox checked={showGates} onChange={(e) => setShowGates(e.target.checked)} />}
              label="Gates"
            />
            <FormControlLabel
              control={
                <Checkbox checked={showJanitorClosets} onChange={(e) => setShowJanitorClosets(e.target.checked)} />
              }
              label="Janitor Closets"
            />
          </Box>
        </Box>

        <Box sx={{ position: 'relative', border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
          <canvas
            ref={canvasRef}
            width={1200}
            height={800}
            style={{ width: '100%', height: 'auto', display: 'block' }}
          />
        </Box>

        {/* Legend */}
        <Box sx={{ mt: 2, display: 'flex', gap: 3, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: '#1976d2', border: '2px solid white' }} />
            <Typography variant="caption">Washrooms</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: '#2e7d32', border: '2px solid white' }} />
            <Typography variant="caption">Gates</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: '#ed6c02', border: '2px solid white' }} />
            <Typography variant="caption">Janitor Closets</Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

export default MapView

