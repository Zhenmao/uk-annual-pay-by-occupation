const margin = {top: 40, right: 40, bottom: 100, left: 50},
      width = 600 - margin.left - margin.right,
      height = 800 - margin.top - margin.bottom;

const circleRadius = 4,
      circlePadding = 0.5;

// Annotation
const type = d3.annotationCalloutCircle;

const svg = d3.select('#chart').append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom);

const g = svg.append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`);

const y = d3.scaleLinear()
    .range([height, 0]);

d3.json('data/data.json', (error, json) => {
  if (error) throw error;

  // Data for "All employees"
  const all = json[0];
  // Data for occupations
  const data = json.slice(1);

  y.domain([
    Math.floor(d3.min(data, d => d.median_4) / 10000) * 10000,
    Math.ceil(d3.max(data, d => d.median_4) / 10000) * 10000,
  ]);

  // Sort data from highest median pay to lowest
  data.sort((a, b) => b.median_4 - a.median_4);
  data.forEach(d => {
    d.x = width / 2;
    d.y = y(d.median_4);
  });

  const simulation = d3.forceSimulation(data)
      .force('x', d3.forceX(width / 2))
      .force('y', d3.forceY(d => y(d.median_4))
          .strength(1))
      .force('collide', d3.forceCollide(circleRadius + circlePadding)
          .strength(1)
          .iterations(5))
      .stop();

  for (let i = 0; i < 120; i++) simulation.tick();

  g.append('g')
      .attr('class', 'axis axis-y')
      .call(d3.axisLeft(y)
          .tickFormat(d => '£' + d3.format(',')(d)))
      .selectAll('.tick line')
        .attr('x2', width)

  // Draw medium line for "All employees"
  const medianLine = g.append('g')
      .attr('class', 'median-line')
      .attr('transform', `translate(0,${y(all.median_4)})`);
  medianLine.append('line')
      .attr('x2', width);
  medianLine.append('text')
      .attr('dy', '-0.32em')
      .text('Median Annual Pay');
  medianLine.append('text')
      .attr('dy', '-0.32em')
      .attr('text-anchor', 'end')
      .attr('x', width)
      .text('£' + d3.format(',')(all.median_4));

  // Voronoi polygons for esay hover
  const voronoi = d3.voronoi()
      .extent([[-margin.left, -margin.top], [width + margin.right, height + margin.top]])
      .x(d => d.x)
      .y(d => d.y);

  const cell = g.append('g')
      .attr('class', 'cells')
    .selectAll('g.cell')
    .data(voronoi.polygons(data))
    .enter().append('g')
      .attr('class', 'cell')
      .on('mouseover', d => {
        if (![data[0], data[data.length - 1]].map(d => d.median_4).includes(d.data.median_4)) {
          tooltip(d.data);
        }
      });
  
  g.on('mouseout', d => tip.selectAll('g').remove());
  
  cell.append('path')
    .attr('d', d => `M${d.join("L")}Z`);
  
  // Draw circle
  cell.append('circle')
      .attr('id', (d, i) => `circle-${i}`)
      .attr('r', circleRadius)
      .attr('cx', d => d.data.x)
      .attr('cy', d => d.data.y);

  // Annotate the extremes
  const annotations = [data[0], data[data.length - 1]].map(d => {
    return {
      data: d,
      dx: 50,
      dy: 20,
      color: '#EE25EC',
      note: {
        title: d.description_2,
        label: d.description_4
      },
      subject: {
        radius: circleRadius,
        radiusPadding: circlePadding
      }
    }
  });

  const makeAnnotations = d3.annotation()
    .type(type)
    .accessors({
      x: d => d.x,
      y: d => d.y
    })
    .annotations(annotations);

  document.fonts.ready.then(() => {
    g.append("g")
      .attr("class", "annotation-group")
      .call(makeAnnotations)
  })

  // Tooltip
  const tip = g.append('g')
      .attr('class', 'tooltip');

  const tooltip = (d) => {
    tip.call(d3.annotation()
      .type(type)
      .accessors({
        x: d => d.x,
        y: d => d.y
      })
      .annotations([{
        data: d,
        dx: d.x > width / 2 ? 50 : -50,
        dy: d.y > height / 2 ? -30 : 30,
        color: '#EE25EC',
        note: {
          title: d.description_2,
          label: d.description_4
        },
        subject: {
          radius: circleRadius,
          radiusPadding: circlePadding
        }
      }]));
  }

});