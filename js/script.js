/**
 * ================================================================
 * EcoMesura · script.js
 * Calculadora de Sostenibilitat — Lògica completa
 *
 * Contingut:
 *  1. Constants i factors d'estacionalitat
 *  2. Funcions de càlcul base
 *  3. Tendències temporals (electricitat, aigua, consumibles)
 *  4. Variabilitat aleatòria ±5%
 *  5. Renderització de targetes d'indicadors
 *  6. Gràfics Chart.js
 *  7. Mode Sostenible (simulador –30%)
 *  8. Gestió de la UI i events
 * ================================================================
 */

'use strict';

/* ============================================================
   1. CONSTANTS I FACTORS D'ESTACIONALITAT
   ============================================================ */

/** Noms dels mesos en català (índex 0 = Gener) */
const MESOS = [
  'Gen', 'Feb', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Des'
];

/**
 * Factors mensuals per a l'energia elèctrica.
 * Pics a l'hivern (calefacció) i estiu (refrigeració/aire condicionat).
 * Basats en patrons reals de centres educatius mediterranis.
 */
const FACTOR_ELECTRIC = [
  1.30,  // Gener     — hivern intens, calefacció al màxim
  1.25,  // Febrer    — hivern, dies curts
  1.10,  // Març      — transició hivern-primavera
  0.95,  // Abril     — primavera suau, consum mínim
  0.90,  // Maig      — primavera agradable
  1.10,  // Juny      — calor inicial, inici refrigeració
  1.30,  // Juliol    — estiu, aire condicionat (si n'hi ha)
  1.35,  // Agost     — màxim estival (centre parcialment obert)
  1.10,  // Setembre  — calor tardana, inici curs
  1.00,  // Octubre   — tardor moderada
  1.15,  // Novembre  — inici calefacció
  1.30   // Desembre  — hivern, calefacció + dies molt curts
];

/**
 * Factors mensuals per al consum d'aigua.
 * Pujada a l'estiu (reg jardins, major higiene personal per la calor).
 * Baixada a l'hivern (menys activitat exterior).
 */
const FACTOR_AIGUA = [
  0.85,  // Gener     — hivern, poc reg, baixa afluència
  0.85,  // Febrer    — hivern
  0.90,  // Març      — inici temporada de reg
  1.00,  // Abril     — activitat normal
  1.10,  // Maig      — reg zones verdes incrementat
  1.25,  // Juny      — calor, reg diari, exàmens
  1.35,  // Juliol    — màxim estival, instal·lacions obertes
  1.30,  // Agost     — estiu (menor ocupació però reg intensiu)
  1.10,  // Setembre  — inici de curs, calor tardana
  1.00,  // Octubre   — tardor, activitat normal
  0.90,  // Novembre  — reducció reg
  0.85   // Desembre  — hivern, consum mínim
];

/**
 * Factors mensuals per als consumibles d'oficina.
 * Pujada en mesos d'alta activitat escolar (setembre, maig, examens).
 * Caiguda pronunciada a l'estiu (juliol-agost).
 */
const FACTOR_OFICINA = [
  1.10,  // Gener     — inici de trimestre, material nou
  1.10,  // Febrer    — activitat normal 2n trimestre
  1.15,  // Març      — avaluació intermèdia, molts documents
  1.05,  // Abril     — Setmana Santa, activitat reduïda
  1.20,  // Maig      — pics d'exàmens finals, impressions
  0.80,  // Juny      — tancat parcialment, últimes setmanes
  0.50,  // Juliol    — vacances estiu, activitat mínima
  0.40,  // Agost     — vacances, centre quasi tancat
  1.20,  // Setembre  — inici de curs, material nou, programació
  1.15,  // Octubre   — 1r trimestre en marxa
  1.10,  // Novembre  — avaluació 1r trimestre
  0.90   // Desembre  — Nadal, activitat reduïda
];

/**
 * Factors mensuals per als productes de neteja.
 * Similar als d'oficina però amb lleugera pujada a setembre
 * (neteja intensa d'inici de curs) i pics post-vacances.
 */
const FACTOR_NETEJA = [
  1.05,  // Gener
  1.00,  // Febrer
  1.10,  // Març      — neteja de primavera
  1.00,  // Abril
  1.10,  // Maig
  0.85,  // Juny
  0.55,  // Juliol
  0.50,  // Agost
  1.30,  // Setembre  — neteja intensa d'inici de curs
  1.05,  // Octubre
  1.05,  // Novembre
  0.95   // Desembre
];

/** Índex dels mesos del curs escolar (Setembre=8 fins a Juny=5, índexos 0-based) */
const MESOS_CURS = [8, 9, 10, 11, 0, 1, 2, 3, 4, 5]; // Sep–Jun

/** Factor de reducció del Mode Sostenible (30%) */
const FACTOR_SOSTENIBLE = 0.70;

/** Llindar de variabilitat aleatòria: ±5% */
const VARIABILITAT = 0.05;

/* ============================================================
   2. FUNCIONS DE CÀLCUL BASE
   ============================================================ */

/**
 * Genera un factor de variabilitat aleatòria dins l'interval [1-v, 1+v].
 * @param {number} v — Amplitud de la variació (0.05 = ±5%)
 * @returns {number} Factor aleatori
 */
function factorVariabilitat(v = VARIABILITAT) {
  return 1 + (Math.random() * 2 * v - v);
}

/**
 * Calcula el consum mensual per a cada mes de l'any aplicant
 * el factor estacional i la variabilitat aleatòria.
 *
 * @param {number}   baseMensual — Consum base mensual (input usuari)
 * @param {number[]} factors     — Array de 12 factors estacionals
 * @returns {number[]} Array de 12 valors mensuals
 */
function calcularMensual(baseMensual, factors) {
  return factors.map(f => {
    const variació = factorVariabilitat();
    return Math.round(baseMensual * f * variació * 100) / 100;
  });
}

/**
 * Suma tots els valors d'un array mensual (any complet = 12 mesos).
 * @param {number[]} mensuals
 * @returns {number}
 */
function sumaAnual(mensuals) {
  return mensuals.reduce((acc, v) => acc + v, 0);
}

/**
 * Suma els valors corresponents als mesos del curs escolar (Sep–Jun).
 * @param {number[]} mensuals — Array de 12 valors
 * @returns {number}
 */
function sumaCurs(mensuals) {
  return MESOS_CURS.reduce((acc, idx) => acc + mensuals[idx], 0);
}

/**
 * Arrodoneix un nombre a N decimals.
 * @param {number} valor
 * @param {number} decimals
 * @returns {number}
 */
function arrodonir(valor, decimals = 2) {
  const factor = Math.pow(10, decimals);
  return Math.round(valor * factor) / factor;
}

/**
 * Formata un nombre per a la UI (separador de milers amb punt).
 * @param {number} valor
 * @param {number} decimals
 * @returns {string}
 */
function formatar(valor, decimals = 1) {
  return valor.toLocaleString('ca-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

/* ============================================================
   3. ESTAT GLOBAL DE L'APLICACIÓ
   ============================================================ */

/** Objecte que emmagatzema tots els resultats de l'últim càlcul */
let resultatActual = null;

/** Indica si el Mode Sostenible està actiu */
let modeSostenibleActiu = false;

/** Instàncies dels gràfics Chart.js */
let chartElectric = null;
let chartAigua    = null;
let chartConsum   = null;

/* ============================================================
   4. FUNCIÓ PRINCIPAL DE CÀLCUL
   ============================================================ */

/**
 * Llegeix els inputs de l'usuari, aplica els factors estacionals
 * i la variabilitat, i retorna l'objecte de resultats complet.
 *
 * @returns {Object} Resultats amb valors mensuals, anuals i de curs
 */
function calcularIndicadors() {
  // Llegir valors del formulari
  const electric  = parseFloat(document.getElementById('consumElectric').value)  || 0;
  const aigua     = parseFloat(document.getElementById('consumAigua').value)      || 0;
  const oficina   = parseFloat(document.getElementById('consumOficina').value)    || 0;
  const neteja    = parseFloat(document.getElementById('consumNeteja').value)     || 0;
  const persones  = parseInt(document.getElementById('persones').value)           || 1;
  const sup       = parseFloat(document.getElementById('superfície').value)       || 1;
  const pctPaper  = parseFloat(document.getElementById('paperReciclatPct').value) || 0;
  const pctEco    = parseFloat(document.getElementById('producteEcoPct').value)   || 0;

  // Calcular sèries mensuals amb estacionalitat + variabilitat
  const electricMensual = calcularMensual(electric, FACTOR_ELECTRIC);
  const aiguaMensual    = calcularMensual(aigua,    FACTOR_AIGUA);
  const oficinaMensual  = calcularMensual(oficina,  FACTOR_OFICINA);
  const netejasMensual  = calcularMensual(neteja,   FACTOR_NETEJA);

  // Calcular totals
  const electricAnual = arrodonir(sumaAnual(electricMensual));
  const electricCurs  = arrodonir(sumaCurs(electricMensual));
  const aiguaAnual    = arrodonir(sumaAnual(aiguaMensual));
  const aiguaCurs     = arrodonir(sumaCurs(aiguaMensual));
  const oficinaAnual  = arrodonir(sumaAnual(oficinaMensual));
  const oficinaCurs   = arrodonir(sumaCurs(oficinaMensual));
  const netejaAnual   = arrodonir(sumaAnual(netejasMensual));
  const netejaCurs    = arrodonir(sumaCurs(netejasMensual));

  // Construir i retornar l'objecte de resultats
  return {
    // Metadades
    persones,
    sup,
    pctPaper,
    pctEco,
    // Sèries mensuals
    electricMensual,
    aiguaMensual,
    oficinaMensual,
    netejasMensual,
    // Els 8 indicadors (4 recursos × 2 períodes)
    indicadors: {
      electricAnual,
      electricCurs,
      aiguaAnual,
      aiguaCurs,
      oficinaAnual,
      oficinaCurs,
      netejaAnual,
      netejaCurs
    }
  };
}

/* ============================================================
   5. RENDERITZACIÓ DE TARGETES D'INDICADORS
   ============================================================ */

/**
 * Definicions de les 8 targetes d'indicadors.
 * Cada objecte indica: clau al resultat, títol, icona, unitat,
 * categoria CSS i període.
 */
const DEFINICIONS_INDICADORS = [
  {
    clau: 'electricAnual', titol: 'Energia Elèctrica',
    icona: '💡', unitat: 'kWh', classe: 'llum', periode: 'Proper Any'
  },
  {
    clau: 'electricCurs', titol: 'Energia Elèctrica',
    icona: '💡', unitat: 'kWh', classe: 'llum', periode: 'Curs Sep–Jun'
  },
  {
    clau: 'aiguaAnual', titol: 'Consum d\'Aigua',
    icona: '💧', unitat: 'm³', classe: 'aigua', periode: 'Proper Any'
  },
  {
    clau: 'aiguaCurs', titol: 'Consum d\'Aigua',
    icona: '💧', unitat: 'm³', classe: 'aigua', periode: 'Curs Sep–Jun'
  },
  {
    clau: 'oficinaAnual', titol: 'Material d\'Oficina',
    icona: '📎', unitat: '€', classe: 'oficina', periode: 'Proper Any'
  },
  {
    clau: 'oficinaCurs', titol: 'Material d\'Oficina',
    icona: '📎', unitat: '€', classe: 'oficina', periode: 'Curs Sep–Jun'
  },
  {
    clau: 'netejaAnual', titol: 'Productes de Neteja',
    icona: '🧹', unitat: '€', classe: 'neteja', periode: 'Proper Any'
  },
  {
    clau: 'netejaCurs', titol: 'Productes de Neteja',
    icona: '🧹', unitat: '€', classe: 'neteja', periode: 'Curs Sep–Jun'
  }
];

/**
 * Genera el HTML d'una targeta indicador.
 *
 * @param {Object} def       — Definició de l'indicador
 * @param {number} valor     — Valor calculat
 * @param {boolean} isSos    — Si Mode Sostenible actiu
 * @param {number}  i        — Índex per a delay d'animació
 * @returns {string} HTML de la targeta
 */
function crearTarjeta(def, valor, isSos, i) {
  const valorFinal = isSos ? arrodonir(valor * FACTOR_SOSTENIBLE) : valor;
  const valorBase  = valor;

  // Subtext contextual
  const subtext = isSos
    ? `Base: ${formatar(valorBase)} ${def.unitat} → estalvi del 30%`
    : `Factor estacional aplicat + variabilitat ±5%`;

  const modeClass = isSos ? 'mode-sos' : '';

  return `
    <article class="indicator-card ${def.classe} ${modeClass}" role="listitem"
      style="animation-delay: ${i * 0.07}s"
      aria-label="${def.titol} — ${def.periode}: ${formatar(valorFinal)} ${def.unitat}">
      <div class="ind-header">
        <span class="ind-icon" aria-hidden="true">${def.icona}</span>
        <span class="ind-period">${def.periode}</span>
      </div>
      <p class="ind-title">${def.titol}</p>
      <p class="ind-value">
        ${formatar(valorFinal)}
        <span class="ind-unit">${def.unitat}</span>
      </p>
      <p class="ind-sub">${subtext}</p>
    </article>
  `;
}

/**
 * Renderitza totes les targetes al contenidor #indicatorsGrid.
 *
 * @param {Object}  res   — Resultat de calcularIndicadors()
 * @param {boolean} isSos — Mode Sostenible actiu?
 */
function renderitzarIndicadors(res, isSos = false) {
  const grid = document.getElementById('indicatorsGrid');
  const { indicadors } = res;

  grid.innerHTML = DEFINICIONS_INDICADORS.map((def, i) =>
    crearTarjeta(def, indicadors[def.clau], isSos, i)
  ).join('');
}

/* ============================================================
   6. GRÀFICS CHART.JS
   ============================================================ */

/** Paleta de colors reutilitzable */
const COLORS = {
  electric: { bar: '#f5c842', border: '#d4860f', line: '#ff9500' },
  aigua:    { bar: '#60c0f5', border: '#2196f3', line: '#0ea5e9' },
  oficina:  { bar: '#6aa67a', border: '#3d7a55', line: '#3d7a55' },
  neteja:   { bar: '#c4b5fd', border: '#7c3aed', line: '#a78bfa' },
  sos:      { bar: 'rgba(168,213,181,0.7)', border: '#2a5c42', line: '#2a5c42' }
};

/** Configuració base compartida per als gràfics */
const baseOptions = (unitat) => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(26,61,43,0.92)',
      titleFont: { family: 'Source Sans 3', size: 12 },
      bodyFont:  { family: 'Source Sans 3', size: 13, weight: '600' },
      padding: 10,
      cornerRadius: 8,
      callbacks: {
        label: ctx => ` ${formatar(ctx.parsed.y)} ${unitat}`
      }
    }
  },
  scales: {
    x: {
      grid: { color: 'rgba(255,255,255,0.06)' },
      ticks: { color: 'rgba(255,255,255,0.6)', font: { size: 11 } }
    },
    y: {
      grid: { color: 'rgba(255,255,255,0.06)' },
      ticks: { color: 'rgba(255,255,255,0.6)', font: { size: 11 } }
    }
  }
});

/**
 * Crea o actualitza un gràfic de barres/línia a un canvas.
 *
 * @param {Chart|null}  instancia  — Instància existent (o null per crear)
 * @param {string}      canvasId   — ID del canvas HTML
 * @param {number[]}    dades      — Array de 12 valors mensuals
 * @param {Object}      colors     — Objecte de colors
 * @param {string}      unitat     — Text de la unitat (kWh, m³, €)
 * @returns {Chart}     Nova instància o actualitzada
 */
function crearGrafic(instancia, canvasId, dades, colors, unitat) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return instancia;

  // Destruir gràfic anterior si existeix
  if (instancia) instancia.destroy();

  return new Chart(ctx, {
    data: {
      labels: MESOS,
      datasets: [
        {
          type: 'bar',
          label: unitat,
          data: dades,
          backgroundColor: colors.bar,
          borderColor: colors.border,
          borderWidth: 1.5,
          borderRadius: 4,
          order: 2
        },
        {
          type: 'line',
          label: 'Tendència',
          data: dades,
          borderColor: colors.line,
          borderWidth: 2.5,
          pointRadius: 3,
          pointBackgroundColor: colors.line,
          tension: 0.4,
          fill: false,
          order: 1
        }
      ]
    },
    options: baseOptions(unitat)
  });
}

/**
 * Renderitza els tres gràfics mensuals (elèctric, aigua, consumibles).
 *
 * @param {Object}  res   — Resultat de calcularIndicadors()
 * @param {boolean} isSos — Mode Sostenible actiu?
 */
function renderitzarGrafics(res, isSos = false) {
  const factor = isSos ? FACTOR_SOSTENIBLE : 1;

  const dadesElectric  = res.electricMensual.map(v => arrodonir(v * factor));
  const dadesAigua     = res.aiguaMensual.map(v    => arrodonir(v * factor));
  const dadesConsumib  = res.oficinaMensual.map((v, i) =>
    arrodonir((v + res.netejasMensual[i]) * factor)
  );

  const colorsEl  = isSos ? COLORS.sos : COLORS.electric;
  const colorsAi  = isSos ? COLORS.sos : COLORS.aigua;
  const colorsCo  = isSos ? COLORS.sos : { bar: 'rgba(106,166,122,0.7)', border: '#3d7a55', line: '#3d7a55' };

  chartElectric = crearGrafic(chartElectric, 'chartElectric', dadesElectric, colorsEl, 'kWh');
  chartAigua    = crearGrafic(chartAigua,    'chartAigua',    dadesAigua,    colorsAi, 'm³');
  chartConsum   = crearGrafic(chartConsum,   'chartConsumibles', dadesConsumib, colorsCo, '€');
}

/* ============================================================
   7. MODE SOSTENIBLE — SIMULADOR D'IMPACTE
   ============================================================ */

/**
 * Definicions de les comparatives del simulador
 * (una targeta per categoria amb comparativa Base vs Sostenible).
 */
const CATEGORIES_SIM = [
  {
    nom: '💡 Energia Elèctrica',
    anual: 'electricAnual',
    curs:  'electricCurs',
    unitat:'kWh'
  },
  {
    nom: '💧 Consum d\'Aigua',
    anual: 'aiguaAnual',
    curs:  'aiguaCurs',
    unitat:'m³'
  },
  {
    nom: '📎 Material d\'Oficina',
    anual: 'oficinaAnual',
    curs:  'oficinaCurs',
    unitat:'€'
  },
  {
    nom: '🧹 Productes de Neteja',
    anual: 'netejaAnual',
    curs:  'netejaCurs',
    unitat:'€'
  }
];

/**
 * Renderitza la vista comparativa del simulador.
 * Mostra costat a costat els valors base i els valors amb –30%.
 *
 * @param {Object} res — Resultat base de calcularIndicadors()
 */
function renderitzarSimulador(res) {
  const { indicadors } = res;
  const cont = document.getElementById('simComparison');

  cont.innerHTML = CATEGORIES_SIM.map(cat => {
    const baseAnual = indicadors[cat.anual];
    const baseCurs  = indicadors[cat.curs];
    const sosAnual  = arrodonir(baseAnual * FACTOR_SOSTENIBLE);
    const sosCurs   = arrodonir(baseCurs  * FACTOR_SOSTENIBLE);

    return `
      <article class="sim-card" role="listitem">
        <p class="sim-card-label">${cat.nom}</p>
        <div class="sim-row">
          <span class="sim-row-name">Proper Any</span>
          <span>
            <span class="sim-row-base">${formatar(baseAnual)} ${cat.unitat}</span>
            &nbsp;→&nbsp;
            <span class="sim-row-new">${formatar(sosAnual)} ${cat.unitat}</span>
          </span>
        </div>
        <div class="sim-row">
          <span class="sim-row-name">Curs Sep–Jun</span>
          <span>
            <span class="sim-row-base">${formatar(baseCurs)} ${cat.unitat}</span>
            &nbsp;→&nbsp;
            <span class="sim-row-new">${formatar(sosCurs)} ${cat.unitat}</span>
          </span>
        </div>
      </article>
    `;
  }).join('');

  // Totals d'estalvi
  const totalElAnual   = arrodonir(indicadors.electricAnual * 0.30);
  const totalAiAnual   = arrodonir(indicadors.aiguaAnual    * 0.30);
  const totalOfAnual   = arrodonir(indicadors.oficinaAnual  * 0.30);
  const totalNeAnual   = arrodonir(indicadors.netejaAnual   * 0.30);

  document.getElementById('simTotal').innerHTML = `
    <p class="sim-total-title">♻️ Estalvi Anual Estimat amb Mode Sostenible</p>
    <div class="sim-total-grid">
      <div class="sim-total-item">
        <span class="sim-total-num">–${formatar(totalElAnual)}</span>
        <span class="sim-total-lbl">kWh estalviats<br/>en electricitat</span>
      </div>
      <div class="sim-total-item">
        <span class="sim-total-num">–${formatar(totalAiAnual)}</span>
        <span class="sim-total-lbl">m³ estalviats<br/>en aigua</span>
      </div>
      <div class="sim-total-item">
        <span class="sim-total-num">–${formatar(totalOfAnual, 0)} €</span>
        <span class="sim-total-lbl">estalviats en<br/>material oficina</span>
      </div>
      <div class="sim-total-item">
        <span class="sim-total-num">–${formatar(totalNeAnual, 0)} €</span>
        <span class="sim-total-lbl">estalviats en<br/>productes neteja</span>
      </div>
    </div>
  `;
}

/* ============================================================
   8. GESTIÓ DE LA UI I EVENTS
   ============================================================ */

/**
 * Mostra o amaga una secció amb atribut hidden.
 * @param {HTMLElement} el
 * @param {boolean}     visible
 */
function mostrar(el, visible) {
  if (visible) {
    el.removeAttribute('hidden');
  } else {
    el.setAttribute('hidden', '');
  }
}

/**
 * Fa scroll suau cap a un element.
 * @param {string} selector — Selector CSS
 */
function scrollA(selector) {
  const el = document.querySelector(selector);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** Anima els números de les targetes amb un efecte de comptador ràpid */
function animarNombre(element, valorFinal) {
  const durada = 600;
  const inici  = performance.now();

  function step(timestamp) {
    const progrés = Math.min((timestamp - inici) / durada, 1);
    const eased   = 1 - Math.pow(1 - progrés, 3); // cubic ease-out
    const actual  = valorFinal * eased;
    element.textContent = formatar(actual);
    if (progrés < 1) requestAnimationFrame(step);
    else             element.textContent = formatar(valorFinal);
  }

  requestAnimationFrame(step);
}

/** Handler del botó "Calcular Indicadors" */
function handleCalcular() {
  const btn = document.getElementById('btnCalcular');
  btn.innerHTML = '<span class="spinner"></span> Calculant...';
  btn.disabled = true;

  // Petit retard per efecte visual
  setTimeout(() => {
    resultatActual = calcularIndicadors();
    modeSostenibleActiu = false;

    // Actualitzar UI
    renderitzarIndicadors(resultatActual, false);
    renderitzarGrafics(resultatActual, false);

    // Mostrar secció resultats
    const seccioRes = document.getElementById('resultats');
    mostrar(seccioRes, true);
    seccioRes.querySelector('#descResultats').textContent =
      `Dades calculades amb estacionalitat real i variabilitat ±5% per a ${resultatActual.persones} persones.`;

    // Activar botó simulador
    document.getElementById('btnActivarSim').disabled = false;

    // Preparar simulador (sense activar-lo)
    renderitzarSimulador(resultatActual);

    // Reset mode sostenible
    actualitzarModeSostenible(false);

    // Restaurar botó
    btn.innerHTML = '<span>⚡</span> Recalcular';
    btn.disabled = false;

    // Scroll cap als resultats
    setTimeout(() => scrollA('#resultats'), 150);

    // Activar scroll reveal
    activarReveal();

  }, 400);
}

/** Handler del botó Mode Sostenible (capçalera i simulador) */
function handleModeSostenible() {
  if (!resultatActual) {
    alert('Primer cal calcular els indicadors!');
    return;
  }

  modeSostenibleActiu = !modeSostenibleActiu;
  actualitzarModeSostenible(modeSostenibleActiu);

  // Actualitzar targetes amb/sense reducció
  renderitzarIndicadors(resultatActual, modeSostenibleActiu);
  renderitzarGrafics(resultatActual, modeSostenibleActiu);

  // Mostrar resultats simulador
  const simResults = document.getElementById('simResults');
  const simCta     = document.getElementById('simCta');
  mostrar(simResults, modeSostenibleActiu);
  mostrar(simCta,     !modeSostenibleActiu);

  if (modeSostenibleActiu) {
    setTimeout(() => scrollA('#simulador'), 150);
  }
}

/**
 * Sincronitza tots els elements de la UI que depenen del mode sostenible.
 * @param {boolean} actiu
 */
function actualitzarModeSostenible(actiu) {
  const btn    = document.getElementById('btnSostenible');
  const banner = document.getElementById('modeBanner');
  const btnSim = document.getElementById('btnActivarSim');

  btn.setAttribute('aria-pressed', actiu ? 'true' : 'false');
  btn.querySelector('.mode-label').textContent = actiu ? 'Mode Base' : 'Mode Sostenible';
  mostrar(banner, actiu);

  if (btnSim) {
    btnSim.textContent = actiu ? '↩ Desactivar Mode Sostenible' : '♻️ Activar Mode Sostenible';
  }
}

/** Handler del botó "Reiniciar" */
function handleReset() {
  // Restaurar valors per defecte
  document.getElementById('consumElectric').value  = '2500';
  document.getElementById('consumAigua').value     = '45';
  document.getElementById('consumOficina').value   = '350';
  document.getElementById('consumNeteja').value    = '180';
  document.getElementById('persones').value        = '120';
  document.getElementById('superfície').value      = '800';
  document.getElementById('paperReciclatPct').value = '20';
  document.getElementById('producteEcoPct').value  = '10';

  // Amagar resultats
  mostrar(document.getElementById('resultats'), false);

  // Netejar gràfics
  if (chartElectric) { chartElectric.destroy(); chartElectric = null; }
  if (chartAigua)    { chartAigua.destroy();    chartAigua    = null; }
  if (chartConsum)   { chartConsum.destroy();   chartConsum   = null; }

  // Reiniciar estat
  resultatActual = null;
  modeSostenibleActiu = false;
  actualitzarModeSostenible(false);

  // Reiniciar simulador
  document.getElementById('btnActivarSim').disabled = true;
  mostrar(document.getElementById('simResults'), false);
  mostrar(document.getElementById('simCta'), true);

  // Botó calcular
  document.getElementById('btnCalcular').innerHTML = '<span>⚡</span> Calcular Indicadors';

  scrollA('body');
}

/* ────────────── Scroll Reveal ────────────── */

/**
 * Observa els elements .reveal i els fa visibles quan entren al viewport.
 */
function activarReveal() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          observer.unobserve(e.target);
        }
      });
    },
    { threshold: 0.1 }
  );

  document.querySelectorAll('.reveal:not(.visible)').forEach(el => observer.observe(el));
}

/* ============================================================
   9. CÀRREGA I MAPATGE DEL FITXER JSON (dataclean.json)
   ============================================================ */

/**
 * Mapeja els camps del dataclean.json als inputs de la calculadora.
 *
 * Lògica de derivació:
 *   • consumElectric → total_consumption_kwh (1 dia) × 30 dies
 *   • consumAigua    → fuga nocturna (L/h) × 4h nocturnes × 30 dies / 1000  [indicador de mínims]
 *   • consumOficina  → Digital Infrastructure Investment (€/mes, indicator-03)
 *   • consumNeteja   → No disponible al JSON → es manté el valor per defecte
 *   • persones       → Mitjana d'alumnes per sessió × 3 grups + personal estimat (20%)
 *   • superfície     → Estimació: capacitat kWp × 30 m²/kWp (instal·lació solar a coberta)
 *
 * @param {Object} data — Objecte JSON parsejat
 */
function mapejatJSON(data) {
  const energy  = data?.data_details?.energy?.daily_record;
  const water   = data?.data_details?.water?.consumption_range_lh;
  const social  = data?.data_details?.social?.sessions_data ?? [];
  const indicadors = data?.esg_indicators ?? [];

  // ── Energia elèctrica (kWh/mes)
  // Consum total diari × 30 dies (inclou solar autoconsumat + importació de xarxa)
  const consumElectric = energy
    ? Math.round(energy.total_consumption_kwh * 30)
    : null;

  // ── Consum d'aigua (m³/mes)
  // NOTA: el JSON només registra la fuga nocturna (1h-5h = 4h).
  // S'utilitza com a indicador de consum base mínim anòmal.
  // Fórmula: avg_L/h × 4h × 30 dies / 1000 = m³/mes de fuga
  const consumAigua = water
    ? Math.round((water.avg * 4 * 30) / 1000 * 10) / 10
    : null;

  // ── Material d'oficina (€/mes)
  // Indicator-03: Digital Infrastructure Investment (O2 + DIGI fibra/mòbil)
  const indOficina = indicadors.find(i => i.id === 'indicator-03');
  const consumOficina = indOficina ? indOficina.value : null;

  // ── Productes de neteja (€/mes)
  // No hi ha cost directe al JSON (proveïdor certificat ISO 14001 però sense factura)
  // Es manté el valor per defecte del formulari
  const consumNeteja = null;

  // ── Nombre de persones
  // Calcular la mitjana d'estudiants per sessió a partir dels 3 grups
  const totalEstudiants = social.length > 0
    ? social.reduce((acc, s) => acc + s.students_in_class, 0) / social.length
    : 18;
  // 3 grups × mitjana alumnes + 20% personal docent/administratiu
  const persones = Math.round(totalEstudiants * 3 * 1.20);

  // ── Superfície estimada (m²)
  // Instal·lació fotovoltaica: 30.94 kWp × ~10 m²/kWp ≈ 310 m² de coberta
  // Edifici estimat: 3× superfície coberta = ~930 m²
  const kWpInstal = data?.data_details?.energy?.total_installed_capacity_kwp ?? 30.94;
  const superfície = Math.round(kWpInstal * 10 * 3);

  // ── % paper reciclat i productes ecològics
  // Indicator-04 (140 recàrregues marcadors) indica compromís de circularitat → 40%
  // Proveïdor neteja amb ISO 14001 → 50% productes ecològics estimat
  const pctPaper   = 40;
  const pctEco     = 50;

  return { consumElectric, consumAigua, consumOficina, consumNeteja, persones, superfície, pctPaper, pctEco };
}

/**
 * Omple el formulari amb les dades derivades del JSON.
 * Posa el camp en verd si té dades reals, i en gris si és una estimació.
 *
 * @param {Object} valors — Resultat de mapejatJSON()
 */
function omplirFormulari(valors) {
  const mapa = [
    { id: 'consumElectric',  valor: valors.consumElectric,  tipus: 'real'     },
    { id: 'consumAigua',     valor: valors.consumAigua,     tipus: 'real'     },
    { id: 'consumOficina',   valor: valors.consumOficina,   tipus: 'real'     },
    { id: 'consumNeteja',    valor: valors.consumNeteja,    tipus: 'estimat'  },
    { id: 'persones',        valor: valors.persones,        tipus: 'calculat' },
    { id: 'superfície',      valor: valors.superfície,      tipus: 'estimat'  },
    { id: 'paperReciclatPct',valor: valors.pctPaper,        tipus: 'calculat' },
    { id: 'producteEcoPct',  valor: valors.pctEco,          tipus: 'calculat' },
  ];

  mapa.forEach(({ id, valor, tipus }) => {
    const input = document.getElementById(id);
    if (!input) return;

    if (valor !== null && valor !== undefined) {
      input.value = valor;
      // Indicació visual del tipus de dada
      input.dataset.jsonSource = tipus;
      input.classList.remove('field-input--real', 'field-input--estimat', 'field-input--calculat');
      input.classList.add(`field-input--${tipus}`);
    }
  });
}

/**
 * Genera les etiquetes de font de dades per al banner superior.
 *
 * @param {Object} data — JSON complet
 * @returns {string} HTML de les etiquetes
 */
function generarEtiquetes(data) {
  const etiquetes = [
    { text: `⚡ Consum: ${Math.round(data.data_details.energy.daily_record.total_consumption_kwh * 30)} kWh/mes`, tipus: 'real' },
    { text: `💧 Fuga nocturna: ${data.data_details.water.consumption_range_lh.avg} L/h`, tipus: 'real' },
    { text: `🌐 Infraestructura digital: ${data.esg_indicators[2]?.value ?? '—'} €/mes`, tipus: 'real' },
    { text: `☀️ FV instal·lat: ${data.data_details.energy.total_installed_capacity_kwp} kWp`, tipus: 'info' },
    { text: `📋 Sessions analitzades: ${data.data_details.social.sessions_data.length}`, tipus: 'info' },
  ];

  return etiquetes.map(e =>
    `<span class="upload-tag upload-tag--${e.tipus}">${e.text}</span>`
  ).join('');
}

/**
 * Processador principal: llegeix el fitxer JSON i activa la UI.
 *
 * @param {File} fitxer — Fitxer .json seleccionat per l'usuari
 */
function processarFitxerJSON(fitxer) {
  if (!fitxer || !fitxer.name.endsWith('.json')) {
    alert('Selecciona un fitxer amb extensió .json');
    return;
  }

  const reader = new FileReader();

  reader.onload = (e) => {
    let data;
    try {
      data = JSON.parse(e.target.result);
    } catch {
      alert('Error llegint el fitxer. Assegura\'t que és un JSON vàlid.');
      return;
    }

    // Mapejat de camps
    const valors = mapejatJSON(data);
    omplirFormulari(valors);

    // Mostrar banner d'èxit
    document.getElementById('uploadIdle').setAttribute('hidden', '');
    document.getElementById('uploadSuccess').removeAttribute('hidden');
    document.getElementById('uploadCenterName').textContent =
      `✅ ${data.center ?? 'Centre carregat'}`;
    document.getElementById('uploadDiagDate').textContent =
      `Diagnòstic ESG · ${data.diagnosis_date ?? ''} · ${data.document_source ?? ''}`;
    document.getElementById('uploadTags').innerHTML = generarEtiquetes(data);

    // Mostrar banner de font de dades
    const banner = document.getElementById('dataSourceBanner');
    banner.removeAttribute('hidden');
    document.getElementById('dataSourceText').innerHTML =
      `Dades reals del <strong>${data.center}</strong> — 
       camps marcats en <span style="color:#2a5c42;font-weight:700">verd</span> provenen del JSON · 
       camps en <span style="color:#92400e;font-weight:700">ambre</span> són estimats · 
       camps en <span style="color:#1e40af;font-weight:700">blau</span> són calculats.`;

    // Activar zona de drop de color
    document.getElementById('uploadZone').classList.add('upload-zone--loaded');

    console.log('%c📂 JSON carregat:', 'color:#2a5c42;font-weight:bold', data.center);
    console.log('%cValors mapejats:', 'color:#6aa67a', valors);
  };

  reader.readAsText(fitxer);
}

/**
 * Reseteja la zona d'upload i restaura els valors per defecte del formulari.
 */
function netejarJSON() {
  document.getElementById('uploadIdle').removeAttribute('hidden');
  document.getElementById('uploadSuccess').setAttribute('hidden', '');
  document.getElementById('dataSourceBanner').setAttribute('hidden', '');
  document.getElementById('uploadZone').classList.remove('upload-zone--loaded');
  document.getElementById('jsonFileInput').value = '';

  // Treure classes de color dels inputs
  document.querySelectorAll('.field-input').forEach(input => {
    input.classList.remove('field-input--real', 'field-input--estimat', 'field-input--calculat');
    delete input.dataset.jsonSource;
  });

  // Restaurar valors per defecte
  handleReset();
}

/* ────────────── Inicialització ────────────── */

document.addEventListener('DOMContentLoaded', () => {

  // Afegir classe reveal a elements de les seccions
  document.querySelectorAll(
    '.form-card, .ec-card, .strategy-table, .simulator-panel, .hero-stat'
  ).forEach(el => el.classList.add('reveal'));

  // Activar observer
  activarReveal();

  // Botons principals
  document.getElementById('btnCalcular').addEventListener('click', handleCalcular);
  document.getElementById('btnReset').addEventListener('click', handleReset);

  // Mode sostenible (capçalera + botó simulador)
  document.getElementById('btnSostenible').addEventListener('click', handleModeSostenible);
  document.getElementById('btnActivarSim').addEventListener('click', handleModeSostenible);

  // ── JSON Upload ──
  const fileInput   = document.getElementById('jsonFileInput');
  const btnUpload   = document.getElementById('btnUpload');
  const uploadZone  = document.getElementById('uploadZone');
  const btnClear    = document.getElementById('btnClearJson');

  // Clic al botó → obre el selector de fitxers
  btnUpload.addEventListener('click', () => fileInput.click());

  // Fitxer seleccionat via diàleg
  fileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) processarFitxerJSON(e.target.files[0]);
  });

  // Drag & Drop sobre la zona d'upload
  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('upload-zone--drag');
  });
  uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('upload-zone--drag');
  });
  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('upload-zone--drag');
    const fitxer = e.dataTransfer.files[0];
    if (fitxer) processarFitxerJSON(fitxer);
  });

  // Botó de netejar JSON
  btnClear.addEventListener('click', netejarJSON);

  // Enter als inputs → calcula
  document.querySelectorAll('.field-input').forEach(input => {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleCalcular();
    });
  });

  console.log('%c🌿 EcoMesura carregat correctament', 'color: #3d7a55; font-weight: bold; font-size: 14px');
  console.log('%cCalculadora de Sostenibilitat · Factors estacionals actius + càrrega JSON', 'color: #6aa67a');
});
