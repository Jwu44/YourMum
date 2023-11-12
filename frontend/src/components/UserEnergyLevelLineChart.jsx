import React, { Component } from 'react';
// import CanvasJSReact from '@canvasjs/react-charts';
import { CanvasJSChart } from './canvasjs.react';
import $ from 'jquery';

// var CanvasJSChart = CanvasJSReact.CanvasJSChart;
var chart;

class UserEnergyLevelLineChart extends Component {
  constructor(props) {
    super(props);
    this.state = {
      data: [
        { y: 40, label: "HTML" },
        { y: 65, label: "ReactJS" },
        { y: 80, label: "CSS" },
        { y: 21, label: "Javascript" },
        { y: 50, label: "Canvas" },
        { y: 42, label: "Node.js" },
        { y: 89, label: "Redux" }
      ]
    };
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
    console.log(e)
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
    console.log(dps)
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
        text: "Skill sets"
      },
      axisX: {
        title: "Framework / Language",
        reversed: true
      },
      axisY: {
        title: "Percentage",
        minimum: 0,
        maximum: 100
      },
      data: [
        {
          type: "column",
          dataPoints: this.state.data
        }
      ]
    };

    return (
      <div id="chartContainer" style={{ width: "50%", margin: "auto" }}>
        <CanvasJSChart options={options} onRef={ref => (chart = ref)} />
      </div>
    );
  }
}

export default UserEnergyLevelLineChart;
