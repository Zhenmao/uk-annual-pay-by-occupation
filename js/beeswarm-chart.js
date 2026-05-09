import { debounce } from "./utils.js";

export default class BeeswarmChart {
  constructor({
    el,
    height,
    data,
    idAccessor,
    yAccessor,
    yDomain,
    rAccessor,
    r,
    colorAccessor,
    color,
    yTickFormatter,
    tooltip,
    tooltipContent,
    highlighted,
    medianValue,
    medianLabel,
  }) {
    this.el = el;
    this.height = height;
    this.data = data.map((d) => ({ ...d }));
    this.medianValue = medianValue;
    this.idAccessor = idAccessor;
    this.yAccessor = yAccessor;
    this.yDomain = yDomain;
    this.rAccessor = rAccessor;
    this.r = r;
    this.colorAccessor = colorAccessor;
    this.color = color;
    this.yTickFormatter = yTickFormatter;
    this.tooltip = tooltip;
    this.tooltipContent = tooltipContent;
    this.highlighted = highlighted;
    this.medianLabel = medianLabel;

    this.iTooltip = null;

    this.moved = this.moved.bind(this);
    this.left = this.left.bind(this);

    this.init();
  }

  init() {
    this.setup();
    this.scaffold();
    new ResizeObserver(
      debounce((entries) =>
        entries.forEach((entry) => this.resized(entry.contentRect)),
      ),
    ).observe(this.el);
  }

  setup() {
    this.marginTop = 4;
    this.marginRight = 0;
    this.marginBottom = 4;
    this.marginLeft = 40;

    this.y = d3
      .scaleLinear()
      .domain(this.yDomain)
      .range([this.height - this.marginBottom, this.marginTop]);
  }

  scaffold() {
    this.container = d3.select(this.el).classed("beeswarm", true);
    this.svg = this.container
      .append("svg")
      .attr("height", this.height)
      .on("pointerenter", this.moved)
      .on("pointermove", this.moved)
      .on("pointerleave", this.left)
      .on("touchstart", (e) => e.preventDefault());
    this.yAxisG = this.svg.append("g").attr("class", "axis");
    this.medianG = this.svg.append("g").attr("class", "median");
    this.bubblesG = this.svg.append("g").attr("class", "bubbles");
  }

  resized({ width }) {
    this.width = width;
    this.svg
      .attr("width", width)
      .attr("viewBox", [0, 0, this.width, this.height]);
    this.computeLayout();
    this.render();
  }

  computeLayout() {
    const x = (this.marginLeft + this.width - this.marginRight) / 2;
    this.data.forEach((d) => {
      if (!d.r) d.r = this.r(this.rAccessor(d));
      d.x0 = x;
      d.y0 = this.y(this.yAccessor(d));
    });
    d3.forceSimulation(this.data)
      .force(
        "x",
        d3
          .forceX()
          .x((d) => d.x0)
          .strength(0.05),
      )
      .force(
        "y",
        d3
          .forceY()
          .y((d) => d.y0)
          .strength(0.8),
      )
      .force(
        "collide",
        d3
          .forceCollide()
          .radius((d) => d.r + 1)
          .iterations(3),
      )
      .tick(200)
      .stop();

    this.delaunay = d3.Delaunay.from(
      this.data,
      (d) => d.x,
      (d) => d.y,
    );
  }

  render() {
    this.renderYAxis();
    this.renderMedian();
    this.renderBubbles();
  }

  renderYAxis() {
    const tickG = this.yAxisG
      .selectChildren()
      .data(
        this.y.ticks((this.height - this.marginTop - this.marginBottom) / 80),
        (d) => d,
      )
      .join((enter) =>
        enter
          .append("g")
          .attr("class", "tick")
          .call((g) => g.append("line"))
          .call((g) =>
            g.append("text").attr("y", -4).text(this.yTickFormatter),
          ),
      )
      .attr("transform", (d) => `translate(0,${this.y(d)})`);

    tickG.select("line").attr("x2", this.width);
  }

  renderMedian() {
    this.medianG.attr("transform", `translate(0,${this.y(this.medianValue)})`);

    this.medianG
      .selectChildren("line")
      .data([this.medianValue])
      .join((enter) => enter.append("line"))
      .attr("x2", this.width);

    this.medianG
      .selectChildren("text")
      .data(this.medianLabel ? [this.medianLabel] : [])
      .join((enter) =>
        enter
          .append("text")
          .attr("text-anchor", "end")
          .attr("y", -4)
          .text((d) => d),
      )
      .attr("x", this.width);
  }

  renderBubbles() {
    this.bubble = this.bubblesG
      .selectChildren()
      .data(this.data, this.idAccessor)
      .join((enter) =>
        enter
          .append("circle")
          .attr("class", "bubble")
          .attr("r", (d) => this.r(this.rAccessor(d)))
          .attr("fill", (d) => this.color(this.colorAccessor(d))),
      )
      .attr("cx", (d) => d.x)
      .attr("cy", (d) => d.y);
  }

  highlightBubbles() {
    if (this.highlighted.size === 0) {
      this.bubblesG.classed("highlighting", false);
      this.bubble.classed("highlighted", false);
    } else {
      this.bubblesG.classed("highlighting", true);
      this.bubble.classed("highlighted", (d) =>
        this.highlighted.has(this.idAccessor(d)),
      );
    }
  }

  moved(event) {
    const [px, py] = d3.pointer(event, this.svg.node());
    const i = this.delaunay.find(px, py);
    if (this.iTooltip === null || this.iTooltip !== i) {
      this.iTooltip = i;
      const d = this.data[i];
      this.tooltip.show(
        this.tooltipContent(d),
        this.color(this.colorAccessor(d)),
      );
      this.bubble.classed("active", (e) => e === d);
    }
    this.tooltip.move(event);
  }

  left() {
    this.iTooltip = null;
    this.tooltip.hide();
    this.bubble.classed("active", false);
  }

  updateHighlighted(highlighted) {
    this.highlighted = highlighted;
    this.highlightBubbles();
  }
}
