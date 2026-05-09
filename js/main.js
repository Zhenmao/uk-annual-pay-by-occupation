import BeeswarmChart from "./beeswarm-chart.js";
import Tooltip from "./tooltip.js";

d3.csv("data/data.csv").then((csv) => {
  const root = processData(csv);

  let highlighted = new Set();
  let charts = [];

  const nameAccessor = (d) => d.data.name;
  const idAccessor = (d) => d.data.code;
  const yAccessor = (d) => d.data.pay;
  const rAccessor = (d) => d.data.jobs;
  const colorAccessor = (d) => d.data.pay;

  const yDomain = computeYDomain(root.leaves(), yAccessor);

  const rMin = 2;
  const rMax = 16;
  const r = d3
    .scaleSqrt()
    .domain(computeRDomain(root.leaves(), rAccessor))
    .range([rMin, rMax]);

  const color = d3
    .scaleDiverging()
    .domain(computeColorDomain(root.leaves(), root, colorAccessor))
    .interpolator(
      d3.piecewise(d3.interpolateHcl, ["#009392", "#e9e29c", "#cf597e"]),
    );

  const payCompactFormatter = new Intl.NumberFormat("en-UK", {
    style: "currency",
    currency: "GBP",
    notation: "compact",
  }).format;

  const payFormatter = new Intl.NumberFormat("en-UK", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format;

  const jobsCompactFormatter = (d) =>
    new Intl.NumberFormat("en-UK", {
      notation: "compact",
    }).format(d * 1000);

  const jobsFormatter = (d) =>
    new Intl.NumberFormat("en-UK", {}).format(d * 1000);

  renderColorLegend({
    el: document.querySelector("#colorLegend"),
    color,
    rMax,
  });

  renderSizeLegend({
    el: document.querySelector("#sizeLegend"),
    r,
    ticks: [5, 50, 100, 500, 1000],
    formatter: jobsCompactFormatter,
    rMax,
  });

  const searchEl = document.querySelector("#occupationSearch");
  const listEl = document.querySelector("#occupationList");
  setupSearchList({
    searchEl,
    listEl,
    data: root.leaves(),
    valueAccessor: idAccessor,
    labelAccessor: nameAccessor,
  });
  searchEl.addEventListener("filter", (e) => {
    const filtered = e.detail;
    highlighted = new Set(filtered);
    charts.forEach((c) => c.updateHighlighted(highlighted));
  });

  const tooltip = new Tooltip(document.querySelector("article"));

  charts.push(
    new BeeswarmChart({
      el: document.querySelector("#all"),
      height: 640,
      data: root.leaves(),
      medianValue: yAccessor(root),
      medianLabel: "Median annual pay",
      idAccessor,
      yAccessor,
      yDomain,
      r,
      rAccessor,
      color,
      colorAccessor,
      yTickFormatter: payCompactFormatter,
      tooltip,
      tooltipContent,
      highlighted,
    }),
  );

  const categoriesEl = document.querySelector("#categories");
  categoriesEl.append(
    ...root.children.map((c) => {
      const el = document.createElement("div");
      el.classList.add("category");

      const h3 = document.createElement("h3");
      h3.textContent = c.data.name;

      const chartEl = document.createElement("div");

      el.append(h3, chartEl);

      charts.push(
        new BeeswarmChart({
          el: chartEl,
          height: 320,
          data: c.children,
          medianValue: yAccessor(c),
          idAccessor,
          yAccessor,
          yDomain,
          r,
          rAccessor,
          color,
          colorAccessor,
          yTickFormatter: payCompactFormatter,
          tooltip,
          tooltipContent,
          highlighted,
        }),
      );
      return el;
    }),
  );

  function tooltipContent(d) {
    const category = nameAccessor(d.parent);
    const name = nameAccessor(d);
    const pay = payFormatter(yAccessor(d));
    const jobs = jobsFormatter(rAccessor(d));
    return /*html*/ `
    <div class="tooltip__content">
      <div class="tooltip__category">${category}</div>
      <div class="tooltip__name">${name}</div>
      <hr />
      <div class="tooltip__item">
        <span class="tooltip__item__key">Median annual pay</span>
        <span class="tooltip__item__value">${pay}</span>
      </div>
      <div class="tooltip__item">
        <span class="tooltip__item__key">Number of jobs</span> 
        <span class="tooltip__item__value">${jobs}</span>
      </div>
    </div>
    `;
  }

  function processData(csv) {
    let root = {};

    csv.forEach((r) => {
      const name = r["Description"].trim();
      const code = r["Code"];
      const jobs = +r["Number of jobs (thousand)"];
      const pay = +r["Median annual pay"];
      if (isNaN(jobs) || isNaN(pay)) return;

      switch (code.length) {
        case 0:
          {
            root = {
              name,
              code,
              jobs,
              pay,
              children: [],
            };
          }
          break;
        case 1:
          {
            root.children.push({
              name,
              code,
              jobs,
              pay,
              children: [],
            });
          }
          break;
        case 4: {
          const parent = root.children.find((c) => c.code === code[0]);
          parent.children.push({
            name,
            code,
            jobs,
            pay,
          });
        }
        default:
          break;
      }
    });

    return d3.hierarchy(root);
  }

  function computeYDomain(data, accessor) {
    return d3.extent(data, accessor);
  }

  function computeRDomain(data, accessor) {
    return d3.extent(data, accessor);
  }

  function computeColorDomain(data, medianData, accessor) {
    return [
      d3.min(data, accessor),
      accessor(medianData),
      d3.max(data, accessor),
    ];
  }

  function setupSearchList({
    searchEl,
    listEl,
    data,
    valueAccessor,
    labelAccessor,
  }) {
    d3.select(listEl)
      .selectChildren()
      .data(data)
      .join("option")
      .attr("value", labelAccessor)
      .sort((a, b) => labelAccessor(a).localeCompare(labelAccessor(b)));
    d3.select(searchEl).on("input", changed);

    function changed(e) {
      const term = e.target.value.toLowerCase().trim();
      let filtered = [];
      if (term !== "") {
        filtered = data
          .filter((d) => labelAccessor(d).toLowerCase().includes(term))
          .map(valueAccessor);
      }

      searchEl.dispatchEvent(new CustomEvent("filter", { detail: filtered }));
    }
  }

  function renderColorLegend({ el, color, rMax }) {
    const swatch = d3
      .select(el)
      .classed("swatches", true)
      .selectChildren()
      .data(
        color
          .range()
          .map((color, i) => ({
            color,
            r: rMax * 0.75,
            label: ["Lowest pay", "Median pay", "Highest pay"][i],
          }))
          .reverse(),
      )
      .join("div")
      .attr("class", "swatch")
      .style("height", `${rMax * 2 + 1}px`);

    swatch
      .append("div")
      .attr("class", "swatch__wrapper")
      .style("width", `${rMax * 2 + 1}px`)
      .style("height", `${rMax * 2 + 1}px`)
      .append("div")
      .attr("class", "swatch__swatch")
      .style("width", (d) => `${d.r * 2}px`)
      .style("height", (d) => `${d.r * 2}px`)
      .style("background-color", (d) => d.color);

    swatch
      .append("div")
      .attr("class", "swatch__label")
      .text((d) => d.label);
  }

  function renderSizeLegend({ el, ticks, r, formatter, rMax }) {
    const swatch = d3
      .select(el)
      .classed("swatches", true)
      .selectChildren()
      .data(
        ticks.map((t) => ({
          r: r(t),
          label: formatter(t),
        })),
      )
      .join("div")
      .attr("class", "swatch")
      .style("height", `${rMax * 2 + 1}px`);

    swatch
      .append("div")
      .attr("class", "swatch__wrapper")
      .style("width", `${rMax * 2 + 1}px`)
      .style("height", `${rMax * 2 + 1}px`)
      .append("div")
      .attr("class", "swatch__swatch")
      .style("width", (d) => `${d.r * 2}px`)
      .style("height", (d) => `${d.r * 2}px`)
      .style("border", "1px solid currentColor");

    swatch
      .append("div")
      .attr("class", "swatch__label")
      .text((d) => d.label);
  }
});
