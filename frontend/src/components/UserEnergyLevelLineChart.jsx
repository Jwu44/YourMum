import React, { Component } from 'react';
import { CanvasJSChart } from './canvasjs.react';
import $ from 'jquery';

var chart;

class UserEnergyLevelLineChart extends Component {
  constructor(props) {
    super(props);
    this.mouseDown = false;
    this.selected = null;
    this.xSnapDistance = 0;
    this.ySnapDistance = 0;
    this.xValue = 0;
    this.yValue = 0;
    this.changeCursor = false;
    this.timerId = null;
  }

  getPosition = (e) => {
    var parentOffset = document
      .getElementsByClassName('canvasjs-chart-container')[0]
      .getBoundingClientRect();
    var relX = e.pageX - parentOffset.left;
    var relY = e.pageY - parentOffset.top;
    this.xValue = Math.round(chart.axisX[0].convertPixelToValue(relX));
    this.yValue = Math.round(chart.axisY[0].convertPixelToValue(relY));
  };

  searchDataPoint = () => {
    var dps = chart.data[0].dataPoints;
    for (var i = 0; i < dps.length; i++) {
      if (
        this.xValue >= dps[i].x - this.ySnapDistance &&
        this.xValue <= dps[i].x + this.ySnapDistance &&
        this.yValue >= dps[i].y - this.xSnapDistance &&
        this.yValue <= dps[i].y + this.xSnapDistance
      ) {
        if (this.mouseDown) {
          this.selected = i;
          break;
        } else {
          this.changeCursor = true;
          break;
        }
      } else {
        this.selected = null;
        this.changeCursor = false;
      }
    }
  };

  componentDidMount() {
    this.xSnapDistance = 1;
    this.ySnapDistance = 3;
    var _this = this;
    $("#canvasjs-react-chart-container-0 > .canvasjs-chart-container").on({
      mousedown: function (e) {
        _this.mouseDown = true;
        _this.getPosition(e);
        _this.searchDataPoint();
      },
      mousemove: function (e) {
        _this.getPosition(e);
        if (_this.mouseDown) {
          clearTimeout(_this.timerId);
          _this.timerId = setTimeout(function () {
            if (_this.selected !== null) {
              chart.data[0].dataPoints[_this.selected].y = _this.yValue;
              chart.render();
            }
          }, 0);
        } else {
          _this.searchDataPoint();
          if (_this.changeCursor) {
            chart.data[0].set("cursor", "n-resize");
          } else {
            chart.data[0].set("cursor", "default");
          }
        }
      },
      mouseup: function (e) {
        if (_this.selected !== null) {
          chart.data[0].dataPoints[_this.selected].y = _this.yValue;
          chart.render();
          _this.mouseDown = false;
        }
      }
    });
  }

  render() {
    const options = {
      backgroundColor: "rgba(255, 255, 255, 0)",
      animationEnabled: true,
      theme: "light2",
      title: {
        text: "Plot your energy levels throughout the day",
      },
      // subtitles: [
      //   {
      //     text: "Click anywhere on plotarea to add new Data Points",
      //   },
      // ],
      axisX: {
				title: "Time (24 hour)",
        labelFormatter: function (e) {
          // Format the label to display in 24-hour format
          var hours = e.value;
          var formattedHours = (hours < 10 ? "0" : "") + hours + ":00";
          return formattedHours;
        },
			},
      axisY: {
				title: "Energy levels (%)",
        minimum: 0,
        maximum: 100,
			},
      data: [
        {
          type: "splineArea",
          cursor: "move",
          dataPoints: [
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { x: 2, y: 0 },
            { x: 3, y: 0 },
            { x: 4, y: 0 },
            { x: 5, y: 0 },
            { x: 6, y: 0 },
            { x: 7, y: 5 },
            { x: 8, y: 30 },
            { x: 9, y: 40 },
            { x: 10, y: 50 },
            { x: 11, y: 70 },
            { x: 12, y: 80 },
            { x: 13, y: 60 },
            { x: 14, y: 80 },
            { x: 15, y: 90 },
            { x: 16, y: 70 },
            { x: 17, y: 60 },
            { x: 18, y: 50 },
            { x: 19, y: 70 },
            { x: 20, y: 70 },
            { x: 21, y: 60 },
            { x: 22, y: 50 },
            { x: 23, y: 30 },
          ],
        },
      ],
    };

    return (
      <div id="chartContainer" style={{ width: "100%", margin: "auto" }}>
        <CanvasJSChart options={options} onRef={ref => (chart = ref)} />
      </div>
    );
  }
}

export default UserEnergyLevelLineChart;
