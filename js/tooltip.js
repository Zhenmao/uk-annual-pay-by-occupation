export default class Tooltip {
  constructor(el) {
    this.el = el;
    this.tooltip = d3.select(this.el).append("div").attr("class", "tooltip");

    this.show = this.show.bind(this);
    this.move = this.move.bind(this);
    this.hide = this.hide.bind(this);
  }
  show(content, color) {
    this.tooltip
      .html(content)
      .classed("visible", true)
      .style("--color-border", color);
    this.elRect = this.el.getBoundingClientRect();
    this.tipRect = this.tooltip.node().getBoundingClientRect();
  }
  move(event) {
    const xOffset = 16;
    const yOffset = 16;

    let [px, py] = d3.pointer(event, this.el);

    let x;
    if (px <= this.elRect.width / 2) {
      x = px + xOffset;
      if (x + this.tipRect.width > this.elRect.width) {
        x = this.elRect.width - this.tipRect.width;
      }
    } else {
      x = px - xOffset - this.tipRect.width;
      if (x < 0) {
        x = 0;
      }
    }

    let y = py + yOffset;
    if (y + this.tipRect.height > this.elRect.height) {
      y = py - yOffset - this.tipRect.height;
      if (y < 0) {
        y = 0;
      }
    }

    this.tooltip.style("transform", `translate(${x}px,${y}px)`);
  }
  hide() {
    this.tooltip.classed("visible", false);
  }
}
