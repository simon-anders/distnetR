"use strict";

function simpleGraph( svgElement, nodePos, edgeList ) {

  var obj = {}

  // append to svgElement
  obj.groupNode = svgElement.append( "g" )
    .classed( "graph", true )
    .style( "stroke", "black");

  // scales
  (function(){
    var mm = minmax( nodePos.map( function(a) { return a.x } ) );
    obj.scaleX = d3.scale.linear()
      .domain( [ mm[0] - 0.05 * (mm[1]-mm[0]), mm[1] + 0.05 * (mm[1]-mm[0]) ] )
      .range( [ 0, parseFloat( svgElement.attr("width") ) ] );
    mm = minmax( nodePos.map( function(a) { return a.y } ) );
    obj.scaleY = d3.scale.linear()
      .domain( [ mm[0] - 0.05 * (mm[1]-mm[0]), mm[1] + 0.05 * (mm[1]-mm[0]) ] )
      .range( [ 0, parseFloat( svgElement.attr("height") ) ] );
    fix_aspect_ratio( obj.scaleX, obj.scaleY, 1 );      
    obj.scaleX.clamp( true );
    obj.scaleY.clamp( true );
  })();

  // construct drag behavior, added in 'update'
  var drag = d3.behavior.drag()
    .on( "drag", function( d, i ) {
       d.x = obj.scaleX.invert( obj.scaleX(d.x) + d3.event.dx )
       d.y = obj.scaleY.invert( obj.scaleY(d.y) + d3.event.dy )
       obj.update() 
     } )

  
  obj.update = function( ) {

    // edges
    var sel = obj.groupNode.selectAll("line")
      .data( edgeList );
    sel.enter().append("line")
    sel.exit().remove()
    sel
      .attr( "x1", function(d) { return obj.scaleX( nodePos[d.p1].x ) } )
      .attr( "y1", function(d) { return obj.scaleY( nodePos[d.p1].y ) } )
      .attr( "x2", function(d) { return obj.scaleX( nodePos[d.p2].x ) } )
      .attr( "y2", function(d) { return obj.scaleY( nodePos[d.p2].y ) } )
      .call( obj.dressEdges )

    // points
    var sel = obj.groupNode.selectAll("circle")
      .data( nodePos );
    sel.enter().append("circle")
      .attr( "r", 6 )
      .call( drag );
    sel.exit().remove()
    sel
      .attr( "cx", function(d) { return obj.scaleX( d.x ) } )
      .attr( "cy", function(d) { return obj.scaleY( d.y ) } )
      .call( obj.dressNodes )

  }
  
  obj.dressEdges = function( edgesSelection ) {
  }

  obj.dressNodes = function( nodesSelection ) {
  }

  return obj  
}

// This function takes two linear scales, and extends the domain of one of them to get 
// the desired x:y aspect ratio 'asp'.
function fix_aspect_ratio( scaleX, scaleY, asp ) {
   var xfactor = ( scaleX.range()[1] - scaleX.range()[0] ) / 
      ( scaleX.domain()[1] - scaleX.domain()[0] )
   var yfactor = ( scaleY.range()[1] - scaleY.range()[0] ) / 
      ( scaleY.domain()[1] - scaleY.domain()[0] )
   var curasp = xfactor / yfactor  // current aspect ratio
   if( curasp > asp ) {  // x domain has to be expanded
      var cur_dom_length = ( scaleX.domain()[1] - scaleX.domain()[0] )
      var extension = cur_dom_length * ( curasp/asp - 1 ) / 2
      scaleX.domain( [ scaleX.domain()[0] - extension, scaleX.domain()[1] + extension ] )      
   } else { // y domain has to be expanded
      var cur_dom_length = ( scaleY.domain()[1] - scaleY.domain()[0] )
      var extension = cur_dom_length * ( asp/curasp - 1 ) / 2
      scaleY.domain( [ scaleY.domain()[0] - extension, scaleY.domain()[1] + extension ] )            
   }
}

// A convenience functions
function minmax( x ) {
   return [ d3.min(x), d3.max(x) ]
}


function distnet( svgElement, nodePos, distMatrix, scale ) {

  var edgeList = []
  for( var i = 0; i < nodePos.length; i++ ) {
    for( var j = i+1; j < nodePos.length; j++ ) {
      edgeList.push( { p1: i, p2: j, dist: distMatrix[i][j] } )
    }
  }

  var obj = simpleGraph( svgElement, nodePos, edgeList )

  obj.dressEdges = function( edgesSelection ) {
     edgesSelection
       .style( "display", function(d) { return scale( d.dist ) > .05 ? null : "none" } )
       .style( "stroke", "darkblue" )
       .style( "stroke-opacity", function(d) { return scale( d.dist ) } );
  }

  return obj;

} 

function sigmoidColorSlider( divElement, maxVal, minColor, maxColor ) {

  var obj = {}

  obj.maxVal = maxVal===undefined ? 1 : maxVal;
  obj.minColor = minColor===undefined ? "darkblue" : maxVal;
  obj.maxColor = maxColor===undefined ? "white" : maxVal;

  var table = divElement.append("table")
    .style( "width", "100%" )
    .style( "table-layout", "fixed" );
  var td1 = table.append("tr").append("td");
  var td2 = table.append("tr").append("td");
  var td3 = table.append("tr").append("td");
  
  var colorBarContainer = td1.append( "svg" )
    .attr( "width", "100%")
    .style( "height", "30px" );
  var theColorBar = colorBar( colorBarContainer );

  var threshSlider = d3.slider()
    .axis( true )
    .max( obj.maxVal )
    .value( obj.maxVal / 4 );
  td2.call( threshSlider )

  var slopeSlider = d3.slider()
    .max( threshSlider.max() * 150 )   // <- FIX this factor
    .value( threshSlider.max() * 50 );
  td3.call( slopeSlider )      

  obj.update = function( ) {
    
    obj.scale = function( x ) { return sigmoid( x, threshSlider.value(), -slopeSlider.value(), .05 ) }; 
    
    var linColorScale = d3.scale.linear()
      .domain( [ 1, 0 ] )
      .range( [ obj.minColor, obj.maxColor ] );

    obj.colorScale = function(x) { return linColorScale( obj.scale( x ) ) }

    theColorBar.scale = function(x) { return obj.colorScale( x * threshSlider.max() ) };

    theColorBar.update();

    for( var i = 0; i < obj.changeListeners.length; i++ ) {
      obj.changeListeners[i].fun.call( obj.changeListeners[i].thisArg );
    }

  }

  obj.changeListeners = [];

  obj.onChange = function( fun, thisArg, add ) {
    if( !add ) {
      obj.changeListeners = [];
    } 
    obj.changeListeners.push( { fun: fun, thisArg: thisArg } );
  }

  threshSlider.on( "slide", obj.update );
  slopeSlider.on( "slide", obj.update );

  obj.update();

  return obj;

}


// The sigmoid function:
function sigmoid( x, threshold, slope, threshVal ) {
   var midpoint = threshold + Math.log( 1/threshVal - 1 ) / slope
   return 1 / ( 1 + Math.exp( -slope * ( x - midpoint ) ) )
}


// Test

/*
var g = simpleGraph( d3.select("#mySvg"),
   [ { x:20, y:10 },
     { x:45, y:25 },
     { x:30, y:15 },
     { x: 8, y:55 } ],
   [ { p1: 0, p2: 1},
     { p1: 0, p2: 2},
     { p1: 1, p2: 3} ] );

var oldDresser = g.dressNodes;
g.dressNodes = function( nodesSelection ) {
  nodesSelection.style( "fill", function( d, i ) { return i == 1 ? "red" : "black" } )
  oldDresser();
}

g.update();
*/

var slider = sigmoidColorSlider( d3.select("#sliderDiv"), d3.max( d3.max( inputdata.distmat ) ) );

var theNet = distnet( d3.select("#mySvg"), 
  inputdata.points2D.map( function(a) { return { x: a[0], y: a[1] } } ), 
  inputdata.distmat,
  slider.scale );

slider.onChange( theNet.update, theNet );

theNet.update()