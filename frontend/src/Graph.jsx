import { useEffect, useRef } from 'react'
import cytoscape from 'cytoscape'
export default function Graph({ nodes, edges, active, labels, onNode, focus, layout = 'cose' }) {
  const el = useRef(), cy = useRef()
  useEffect(() => {
    const col = r => r >= 60 ? '#f43f5e' : r >= 40 ? '#f59e0b' : '#22d3ee'
    cy.current = cytoscape({ container: el.current, elements: [
      ...nodes.map(n => ({ data: { id: n.id, label: n.id.slice(-4), color: n.mule ? '#a78bfa' : col(n.risk) } })),
      ...edges.map(e => ({ data: { id: e.id, source: e.source, target: e.target, label: labels ? Math.round(e.amount) : '' } }))],
      style: [{ selector: 'node', style: { 'background-color': 'data(color)', label: 'data(label)', color: '#cbd5e1', 'font-size': 9, width: 22, height: 22 } },
        { selector: 'edge', style: { width: 1.5, 'line-color': '#334155', 'target-arrow-color': '#334155', 'target-arrow-shape': 'triangle', 'curve-style': 'bezier', label: 'data(label)', 'font-size': 7, color: '#94a3b8' } },
        { selector: '.on', style: { 'line-color': '#22d3ee', 'target-arrow-color': '#22d3ee', width: 4 } },
        { selector: 'node.on', style: { 'border-width': 4, 'border-color': '#fff' } }, { selector: '.hot', style: { 'line-color': '#f43f5e', 'target-arrow-color': '#f43f5e', width: 5 } }],
      layout: layout === 'breadthfirst' ? { name: 'breadthfirst', directed: true, padding: 30, spacingFactor: 1.3 } : { name: layout, animate: false, padding: 30 } })
    if (focus) cy.current.getElementById(focus).style({ 'border-width': 4, 'border-color': '#fff', width: 30, height: 30 })
    cy.current.on('tap', 'node', e => onNode && onNode(e.target.id()))
    return () => cy.current.destroy()
  }, [nodes, edges, labels, focus, layout])
  useEffect(() => {
    const c = cy.current; if (!c) return; c.elements().removeClass('on hot')
    if (active) { const e = c.getElementById(active.id); e.addClass(active.hot ? 'hot' : 'on'); e.connectedNodes().addClass('on') }
  }, [active])
  return <div ref={el} className="graph" />
}
