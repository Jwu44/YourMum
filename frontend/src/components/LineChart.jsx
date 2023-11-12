import React, { useRef, useEffect } from 'react';
import CanvasJSReact from '@canvasjs/react-charts';

// var CanvasJS = CanvasJSReact.CanvasJS;
var CanvasJSChart = CanvasJSReact.CanvasJSChart;

function ChartContainer() {
  const chartRef = useRef(null);
  let chart; 

  useEffect(() => {
     chart = new CanvasJSChart.Chart("chartContainer", {
      animationEnabled: true,
      theme: "light2",
      title: {
        text: "Try dragging Data Points to reposition them",
      },
      subtitles: [
        {
          text: "Click anywhere on plotarea to add new Data Points",
        },
      ],
      axisX: {
        minimum: 0,
        maximum: 120,
      },
      data: [
        {
          type: "spline",
          cursor: "move",
          dataPoints: [
            { x: 10, y: 71 },
            { x: 20, y: 55 },
            { x: 30, y: 50 },
            { x: 40, y: 65 },
            { x: 50, y: 95 },
            { x: 60, y: 68 },
            { x: 70, y: 28 },
            { x: 80, y: 34 },
            { x: 90, y: 14 },
          ],
        },
      ],
    });

    chartRef.current = chart;

    chart.render();

    let record = false;
    const snapDistance = 5;
    let xValue, yValue, parentOffset, relX, relY;
    let selected;
    let newData = false;
    let timerId = null;

    const chartContainer = chartRef.current.container;

    const handleMouseDown = (e) => {
      parentOffset = chartContainer.getBoundingClientRect();
      relX = e.pageX - parentOffset.left;
      relY = e.pageY - parentOffset.top;
      xValue = Math.round(chart.axisX[0].convertPixelToValue(relX));
      yValue = Math.round(chart.axisY[0].convertPixelToValue(relY));
      const dps = chart.data[0].dataPoints;
      for (let i = 0; i < dps.length; i++) {
        if (
          xValue >= dps[i].x - snapDistance &&
          xValue <= dps[i].x + snapDistance &&
          yValue >= dps[i].y - snapDistance &&
          yValue <= dps[i].y + snapDistance
        ) {
          record = true;
          selected = i;
          break;
        } else {
          selected = null;
        }
      }
      newData = selected === null;
      if (newData) {
        chart.data[0].addTo("dataPoints", { x: xValue, y: yValue });
        chart.axisX[0].set("maximum", Math.max(chart.axisX[0].maximum, xValue + 30));
        // chart.render();
      }
    };

    const handleMouseMove = (e) => {
      if (record && !newData) {
        parentOffset = chartContainer.getBoundingClientRect();
        relX = e.pageX - parentOffset.left;
        relY = e.pageY - parentOffset.top;
        xValue = Math.round(chart.axisX[0].convertPixelToValue(relX));
        yValue = Math.round(chart.axisY[0].convertPixelToValue(relY));
        clearTimeout(timerId);
        timerId = setTimeout(() => {
          if (selected !== null) {
            chart.data[0].dataPoints[selected].x = xValue;
            chart.data[0].dataPoints[selected].y = yValue;
            chart.render();
          }
        }, 0);
      }
    };

    const handleMouseUp = () => {
      if (selected !== null) {
        chart.data[0].dataPoints[selected].x = xValue;
        chart.data[0].dataPoints[selected].y = yValue;
        chart.render();
        record = false;
      }
    };

    chartContainer.addEventListener('mousedown', handleMouseDown);
    chartContainer.addEventListener('mousemove', handleMouseMove);
    chartContainer.addEventListener('mouseup', handleMouseUp);

    return () => {
      chartContainer.removeEventListener('mousedown', handleMouseDown);
      chartContainer.removeEventListener('mousemove', handleMouseMove);
      chartContainer.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <div>
      <CanvasJSChart options={chartRef} />
    </div>
  );
}

export default ChartContainer;
