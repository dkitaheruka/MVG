/**
 * Module d'exportation et d'impression directe des diagrammes graphiques
 * Permet l'exportation en image haute définition (PNG), la copie dans le presse-papier,
 * et l'impression vectorielle ou image telle quelle sur papier / PDF.
 */

export interface ExportChartOptions {
  titre: string
  sousTitre?: string
  nomFichier?: string
  nomAgence?: string
  entreprise?: {
    nomSociete?: string
    sigle?: string
  }
}

/**
 * Clone un SVG Recharts en intégrant les styles calculés (couleurs, polices, opacités)
 * pour garantir que le rendu sur Canvas ou à l'impression soit 100% identique à l'écran.
 */
function clonerSvgAvecStyles(sourceSvg: SVGSVGElement): SVGSVGElement {
  const clone = sourceSvg.cloneNode(true) as SVGSVGElement
  const sourceElements = sourceSvg.querySelectorAll('*')
  const cloneElements = clone.querySelectorAll('*')

  const bbox = sourceSvg.getBoundingClientRect()
  const width = Math.round(bbox.width) || 720
  const height = Math.round(bbox.height) || 360

  clone.setAttribute('width', String(width))
  clone.setAttribute('height', String(height))
  if (!clone.getAttribute('viewBox')) {
    clone.setAttribute('viewBox', `0 0 ${width} ${height}`)
  }
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')

  // Copier les styles calculés essentiels pour chaque nœud
  for (let i = 0; i < sourceElements.length && i < cloneElements.length; i++) {
    const src = sourceElements[i] as HTMLElement | SVGElement
    const dst = cloneElements[i] as SVGElement
    try {
      const computed = window.getComputedStyle(src)
      const fill = computed.getPropertyValue('fill')
      const stroke = computed.getPropertyValue('stroke')
      const strokeWidth = computed.getPropertyValue('stroke-width')
      const color = computed.getPropertyValue('color')
      const fontSize = computed.getPropertyValue('font-size')
      const fontFamily = computed.getPropertyValue('font-family')
      const fontWeight = computed.getPropertyValue('font-weight')
      const opacity = computed.getPropertyValue('opacity')

      if (fill && fill !== 'none' && !dst.getAttribute('fill')) {
        dst.setAttribute('fill', fill)
      }
      if (stroke && stroke !== 'none' && !dst.getAttribute('stroke')) {
        dst.setAttribute('stroke', stroke)
      }
      if (strokeWidth && strokeWidth !== '0px' && !dst.getAttribute('stroke-width')) {
        dst.setAttribute('stroke-width', strokeWidth)
      }
      if (color && !dst.getAttribute('fill') && dst.tagName.toLowerCase() === 'text') {
        dst.setAttribute('fill', color)
      }
      if (fontSize) dst.style.fontSize = fontSize
      if (fontFamily) dst.style.fontFamily = fontFamily || 'Segoe UI, system-ui, sans-serif'
      if (fontWeight) dst.style.fontWeight = fontWeight
      if (opacity && opacity !== '1') dst.style.opacity = opacity
    } catch {
      // Ignorer les erreurs d'éléments inaccessibles
    }
  }

  return clone
}

/**
 * Convertit un conteneur de diagramme en Image Canvas haute résolution (x2)
 */
export async function genererCanvasDiagramme(
  container: HTMLElement,
  options: ExportChartOptions
): Promise<HTMLCanvasElement> {
  const svg = container.querySelector('svg.recharts-surface') as SVGSVGElement || container.querySelector('svg')
  if (!svg) {
    throw new Error('Aucun diagramme graphique (SVG) détecté dans ce conteneur.')
  }

  const clonedSvg = clonerSvgAvecStyles(svg)
  const serializer = new XMLSerializer()
  const svgString = serializer.serializeToString(clonedSvg)

  // Extraire les légendes HTML si présentes
  const legendsText: string[] = []
  const legendItems = container.querySelectorAll('.recharts-legend-item, .chart-legend-badge')
  legendItems.forEach((item) => {
    const txt = item.textContent?.trim()
    if (txt) legendsText.push(txt)
  })

  const bbox = svg.getBoundingClientRect()
  const width = Math.max(Math.round(bbox.width) || 720, 680)
  const height = Math.max(Math.round(bbox.height) || 360, 320)

  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(svgBlob)

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      try {
        const padding = 28
        const headerHeight = 76
        const footerHeight = legendsText.length > 0 ? 56 : 38
        const totalW = width + padding * 2
        const totalH = height + headerHeight + footerHeight

        const scale = 2 // Haute définition (Retina 2x)
        const canvas = document.createElement('canvas')
        canvas.width = totalW * scale
        canvas.height = totalH * scale

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          URL.revokeObjectURL(url)
          reject(new Error('Impossible d initialiser le contexte graphique Canvas 2D.'))
          return
        }

        ctx.scale(scale, scale)

        // 1. Fond blanc pur avec bordure subtile
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, totalW, totalH)

        // 2. Bande d'accentuation en haut
        const grad = ctx.createLinearGradient(0, 0, totalW, 0)
        grad.addColorStop(0, '#0284c7')
        grad.addColorStop(0.5, '#0ea5e9')
        grad.addColorStop(1, '#10b981')
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, totalW, 4)

        // 3. Cadre élégant
        ctx.strokeStyle = '#e2e8f0'
        ctx.lineWidth = 1
        ctx.strokeRect(1, 1, totalW - 2, totalH - 2)

        // 4. Titre officiel
        ctx.fillStyle = '#0f172a'
        ctx.font = 'bold 16px "Segoe UI", system-ui, -apple-system, sans-serif'
        ctx.fillText(options.titre, padding, padding + 16)

        // 5. Sous-titre et contexte d'analyse
        const societe = options.entreprise?.nomSociete || 'Entreprise Industrielle & Commerciale'
        const agence = options.nomAgence ? ` • Périmètre : ${options.nomAgence}` : ''
        ctx.fillStyle = '#64748b'
        ctx.font = '11px "Segoe UI", system-ui, -apple-system, sans-serif'
        ctx.fillText(
          `${societe}${agence} • Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`,
          padding,
          padding + 34
        )

        // 6. Ligne de séparation
        ctx.strokeStyle = '#f1f5f9'
        ctx.beginPath()
        ctx.moveTo(padding, padding + 44)
        ctx.lineTo(totalW - padding, padding + 44)
        ctx.stroke()

        // 7. Dessiner le diagramme SVG
        ctx.drawImage(img, padding, headerHeight, width, height)

        // 8. Légendes sous le graphique si trouvées
        if (legendsText.length > 0) {
          ctx.fillStyle = '#475569'
          ctx.font = '600 10.5px "Segoe UI", system-ui, sans-serif'
          const legStr = 'Séries : ' + legendsText.join('  |  ')
          ctx.fillText(legStr, padding, totalH - footerHeight + 20)
        }

        // 9. Mention de certification
        ctx.fillStyle = '#94a3b8'
        ctx.font = 'italic 9.5px "Segoe UI", system-ui, sans-serif'
        ctx.fillText(
          'Document analytique certifié - Conforme aux données d exploitation ERP',
          padding,
          totalH - 14
        )

        URL.revokeObjectURL(url)
        resolve(canvas)
      } catch (err) {
        URL.revokeObjectURL(url)
        reject(err)
      }
    }
    img.onerror = (_e) => {
      URL.revokeObjectURL(url)
      reject(new Error('Erreur lors du rendu du graphique SVG en image.'))
    }
    img.src = url
  })
}

/**
 * Télécharge directement l'image du diagramme graphique en format PNG Haute Définition
 */
export async function telechargerDiagrammeImagePng(
  container: HTMLElement,
  options: ExportChartOptions
): Promise<void> {
  const canvas = await genererCanvasDiagramme(container, options)
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Échec de création du fichier image PNG.'))
        return
      }
      const dateStr = new Date().toISOString().slice(0, 10)
      const baseName = (options.nomFichier || options.titre)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')

      const downloadUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = `diagramme_${baseName}_${dateStr}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000)
      resolve()
    }, 'image/png', 1.0)
  })
}

/**
 * Copie l'image du diagramme dans le presse-papier du système d'exploitation
 */
export async function copierDiagrammePressePapier(
  container: HTMLElement,
  options: ExportChartOptions
): Promise<boolean> {
  try {
    const canvas = await genererCanvasDiagramme(container, options)
    return new Promise((resolve) => {
      canvas.toBlob(async (blob) => {
        if (!blob || !navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
          resolve(false)
          return
        }
        try {
          await navigator.clipboard.write([
            new ClipboardItem({
              'image/png': blob,
            }),
          ])
          resolve(true)
        } catch {
          resolve(false)
        }
      }, 'image/png')
    })
  } catch {
    return false
  }
}

/**
 * Imprime directement l'image du diagramme tel quel via une fenêtre d'impression dédiée A4
 * avec en-têtes officiels, pleine largeur, couleurs exactes sans perte.
 */
export async function imprimerImageDiagrammeTelQuel(
  container: HTMLElement,
  options: ExportChartOptions
): Promise<void> {
  const canvas = await genererCanvasDiagramme(container, options)
  const imageDataUrl = canvas.toDataURL('image/png')

  const societe = options.entreprise?.nomSociete || 'Entreprise Industrielle & Commerciale'
  const dateStr = new Date().toLocaleDateString('fr-FR')
  const heureStr = new Date().toLocaleTimeString('fr-FR')

  const printWindow = window.open('', '_blank', 'width=950,height=720')
  if (!printWindow) {
    // Si popup bloqué, afficher l'image dans une balise ou créer un iframe
    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    document.body.appendChild(iframe)

    const doc = iframe.contentWindow?.document
    if (!doc) throw new Error('Impossible d ouvrir le module d impression.')

    doc.open()
    doc.write(genererHtmlPageImpressionImage({
      imageDataUrl,
      titre: options.titre,
      societe,
      dateStr,
      heureStr,
      nomAgence: options.nomAgence,
    }))
    doc.close()

    setTimeout(() => {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
      setTimeout(() => document.body.removeChild(iframe), 2000)
    }, 500)
    return
  }

  printWindow.document.open()
  printWindow.document.write(genererHtmlPageImpressionImage({
    imageDataUrl,
    titre: options.titre,
    societe,
    dateStr,
    heureStr,
    nomAgence: options.nomAgence,
  }))
  printWindow.document.close()

  // Déclencher automatiquement l'impression dès que l'image est chargée
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.focus()
      printWindow.print()
    }, 350)
  }
}

function genererHtmlPageImpressionImage(params: {
  imageDataUrl: string
  titre: string
  societe: string
  dateStr: string
  heureStr: string
  nomAgence?: string
}): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8"/>
  <title>Impression Diagramme - ${params.titre.replace(/"/g, '&quot;')}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 10mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      margin: 0;
      padding: 16px;
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .print-controls {
      position: sticky;
      top: 0;
      width: 100%;
      max-width: 1050px;
      background: #0f172a;
      color: #ffffff;
      padding: 10px 18px;
      border-radius: 8px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .print-controls button {
      background: #0284c7;
      color: #ffffff;
      border: none;
      padding: 8px 18px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
    }
    .print-controls button:hover {
      background: #0369a1;
    }
    .diagram-container {
      width: 100%;
      max-width: 1050px;
      background: #ffffff;
      padding: 12px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.06);
      text-align: center;
    }
    .diagram-img {
      width: 100%;
      height: auto;
      display: block;
      border-radius: 4px;
    }
    @media print {
      body {
        background: #ffffff;
        padding: 0;
      }
      .print-controls {
        display: none !important;
      }
      .diagram-container {
        padding: 0;
        box-shadow: none;
        max-width: 100%;
      }
      .diagram-img {
        width: 100%;
        max-height: 94vh;
        object-fit: contain;
      }
    }
  </style>
</head>
<body>
  <div class="print-controls">
    <div>
      <strong>Impression Haute Définition du Diagramme</strong>
      <span style="opacity: 0.8; font-size: 11.5px; margin-left: 10px;">${params.societe} • ${params.dateStr}</span>
    </div>
    <div style="display: flex; gap: 8px;">
      <button onclick="window.print()">🖨️ Lancer l'Impression (A4 / PDF)</button>
      <button onclick="window.close()" style="background: #475569;">Fermer</button>
    </div>
  </div>

  <div class="diagram-container">
    <img src="${params.imageDataUrl}" class="diagram-img" alt="Diagramme graphique analytique" />
  </div>
</body>
</html>`
}
