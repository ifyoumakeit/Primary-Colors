var d3, topojson;

//CHECK IF SVGS WORK
if (!Modernizr.inlinesvg) {
    d3.select(".ieWarning")
    .style("display", "block");
}

//TURN OFF CONSOLE LOG
// console.log = function() {}

var PrimaryColors = {

    widthMap : 960,
    heightMap : 575,
    scaleMax : 20,
    scale : 1,
    current: null,
    fontSize: 3.5,
    
    rateById : {},
    nameById : {},
    restricted : false,
    resized : false,

    textClasses : "text_dem text_gop text_lvl1 text_lvl2 text_lvl3 text_lvl4",
    colorClasses : "color_dem color_gop color_lvl1 color_lvl2 color_lvl3 color_lvl4",
    partyClasses : "politician-D politician-R politician-I",
    zoomStates : "VT NJ DE NH MA CT RI MD",
          
    clickedMap : function(d){
        if (d3.event.defaultPrevented) return;
        var root = PrimaryColors;
        var current = d3.select(this);
        var currentId = current.attr("id");
        var rootId = root.current ? root.current.attr("id") : 0;
        if(rootId === currentId || !root.isLive(d.id)){           
            window.location = root.getLink(currentId);
        } else {                        
            //ZOOM IN
            root.setScale(current.attr("height"));
            root.zoomMap(current);
        }
        //SET CURRENT
        root.current = current;
    },

    setScale : function(h){
        var root = PrimaryColors;
        var height = h ? h : root.heightMap;
        var scale = d3.select("svg").attr("height")/height * 0.75;
        root.changeScale(scale);
    },

    changeScale : function(scale){
        var root = PrimaryColors;
        root.scale = scale;
        root.scale = (root.scale <= root.scaleMax) ? root.scale : root.scaleMax;
        root.scale = (root.scale > 1) ? root.scale : 1;
    },

    getLink : function(abbr) {
        var root = PrimaryColors;
        var kind = (root.type===5) ? "senate" : "house";
        var link = "http://primarycolors.net/"+kind+"/states/";
        link += (abbr.indexOf("-")!==-1) ? abbr.split("-")[0] + "/" : "";
        link += abbr;
        return link;
    },

    zoomMap : function(curr){
        var root = PrimaryColors;

        if(curr){
            root.cx = parseInt(curr.attr("cx"));
            root.cy = parseInt(curr.attr("cy"));
            
            root.setScale(curr.attr("height"));
            if(!(curr.attr("id").indexOf("-")===-1 && root.type===6)){ root.reloadInfo(curr.attr("did")); }
        }
        console.log("ZOOM");
        var trans = (root.scale!==1) ? "translate(" + root.widthMap / 2 + "," + root.heightMap / 2+ ")scale("+root.scale+")translate(" + -root.cx + "," + -root.cy + ")" : "translate(0,0)";
        
        if(!root.initial)
            root.features.transition().duration(750).attr("transform", trans);
        else{
            root.features.attr("transform", trans);
        }

        root.STATES_BORDER.style("stroke-width", 1.5/root.scale+"px");
        root.DISTRICTS_BORDER.style("stroke-width", 1/root.scale+"px");       
    },

    mouseoverMap : function(d,self){
        console.log("MOUSEOVER");
        var root = PrimaryColors;
        if(root.isLive(d.id)){       
            root.reloadInfo(d.id);
        }
    
    },

    reloadInfo : function(id){
        var root = PrimaryColors;

        id = parseInt(id);
        if(root.currentStateId===id){ return false; }

        var d = root.info[id];

        root.resetHidden.hide();

        root.mapInfo.show();
        root.mapInfo.find("#district").html("<a href='" + root.getLink(d.ABBR) + "' target='_self'>" + d.AREA + "</a>");
        root.mapInfo.find("#pvi").html(d.PVI).attr("class",d.PVI);

        $.each(d.POL,function(index,p){
            //console.log(index);
            var classBar = (p.PARTY==="R") ? "color_gop" : "color_dem";
            if(p.BIOGUIDE=="Open")
                $("#open").show();
            var b = root.politician[index].removeClass(root.partyClasses).addClass("politician-"+p.PARTY);
            
            root.politician[index].img.attr("src","http://primarycolors.net/40x50/"+p.BIOGUIDE+".jpg");

            root.politician[index].fullname.html("<a href='http://www.primarycolors.net/politician/"+p.BIOGUIDE+"'>"+p.NAME+"</a>");
            root.politician[index].description.html(p.TEXT);
            root.politician[index].party.html(p.PARTY);

            root.politician[index].ESscore.html(parseFloat(p.ES).toFixed(1));
            root.politician[index].ESbar.removeClass(root.colorClasses).addClass(classBar).stop().animate({"width" : p.ES+"%"},500);
            root.politician[index].ASscore.html(parseFloat(p.AS).toFixed(1));
            root.politician[index].ASbar.removeClass(root.colorClasses).addClass(classBar).stop().animate({"width" : p.AS+"%"},500);

            var pv = (p.PV.indexOf("-")===0 || p.PV.indexOf("Open")===0) ? p.PV : "+"+p.PV;
          
            root.politician[index].PV.html(pv);

            var score = parseInt(p.PS,10);

            if(isNaN(score)){    
                root.politician[index].PS.css("left","-70px");
            }else{
                var txtClass = p.CLASS.replace("color","text");
                var display = (score===0) ? "<i class='fa fa-star'></i>" : score;
                root.politician[index].PSvalue.removeClass().addClass("value "+txtClass+" grade-"+score).html(display);
                root.politician[index].PS.css("left","10px");
            }
            
            var riskClass = p.RISK ? p.CLASS : "";
            root.politician[index].primaried.removeClass(root.colorClasses).addClass(riskClass).html(p.RISK+"<br /><strong>"+p.PRIMARIED+"</strong>");
            root.currentStateId = id;
        });

        if(!root.resized)
        {   
            console.log("RESIZING");
            $(window).trigger("resize")
            root.resized = true;
        }

    },

    isLive : function(id){
        var root = PrimaryColors;
        //console.log(root.nameById[id],id);
        if(root.nameById[id]!==undefined){
            return !root.nameById[id].indexOf(root.initial) ? true : false;
        }
        return false;
    },

    createMap : function(){
        var root = this;

        var drag = d3.behavior
            .drag()
            .origin(function(d,i) { return {x: root.cx, y: root.cy}; })
            .on("dragstart",
                function(d) {
                    console.log('START');
                    d3.event.sourceEvent.stopPropagation(); 
                    $('path').css('cursor','move');
                }
            )
            .on("drag",  
                function(d) {      
                    console.log('DRAG');
                    root.cx = root.cx - d3.event.dx;
                    root.cy = root.cy - d3.event.dy;
                    var trans = "translate(" + root.widthMap / 2 + "," + root.heightMap / 2+ ")scale("+root.scale+")translate(" + -root.cx + "," + -root.cy + ")";
    
                    if(d3.event.dy !== undefined && root.scale!==1){
                        console.log("MOVING: "+root.cx+","+root.cy);
                        root.features.transition().duration(400).attr("transform", trans);
                    }
    
                }
            ).on("dragend",
                function(d) {
                    console.log('END');
                    $('path').css('cursor','');
                }
            );

    	if(root.type===6){
    		console.log("LOADING DISTRICTS");
	        this.DISTRICTS = this.features.selectAll("path.district")
	            .data(topojson.feature(this.us, this.us.objects.districts).features)
	            .enter().append("path")
	            .attr("class", function(d) {return "district " + root.getColorClass(d.id); })
	            .attr("id", function(d) { return root.nameById[d.id]; })
	            .attr("cx", function(d){ return root.path.centroid(d)[0];})
	            .attr("cy", function(d){ return root.path.centroid(d)[1];})
	            .attr("height", function(d){ return Math.abs(root.path.bounds(d)[1][0] - root.path.bounds(d)[0][0]);})
	            .attr("did", function(d){ return d.id;})
	            .attr("d", this.path)
	            .on("mouseover",  function(d){ root.mouseoverMap(d,this);})
	            .on("click", this.clickedMap).call(drag);

        	console.log("LOADING ZOOM STATES & INITIAL DISTRICT[S]");
        	this.STATES = this.features.selectAll("path.state")
	            .data(topojson.feature(this.us, this.us.objects.states).features.filter(function(d){if(root.initial.indexOf(d.properties.APname) > -1 || root.zoomStates.indexOf( d.properties.APname) > -1) return d;}))
	            .enter().append("path")
	            .attr("id", function(d) { return d.properties.APname;})
	            .attr("cx", function(d){ return root.path.centroid(d)[0];})
	            .attr("cy", function(d){ return root.path.centroid(d)[1];})
	            .attr("did", function(d){  return d.id;})
	            .attr("height", function(d){ return Math.abs(root.path.bounds(d)[1][0] - root.path.bounds(d)[0][0]);})
	            .attr("d", this.path);
	    }
        
        if(root.type===5){
        	console.log("LOADING ALL STATES");
            this.STATES = this.features.selectAll("path.state")
	            .data(topojson.feature(this.us, this.us.objects.states).features)
	            .enter().append("path")
	            .attr("id", function(d) { return d.properties.APname;})
	            .attr("cx", function(d){ return root.path.centroid(d)[0];})
	            .attr("cy", function(d){ return root.path.centroid(d)[1];})
	            .attr("did", function(d){ return d.id;})
	            .attr("height", function(d){ return Math.abs(root.path.bounds(d)[1][0] - root.path.bounds(d)[0][0]);})
	            .attr("d", this.path)
                .attr("class", function(d) { return "state " + root.getColorClass(d.id); })
                .on("click", this.clickedMap)
                .on("mouseover",  function(d){ root.mouseoverMap(d,this);})
                .call(drag);
   		}     

        
        this.STATES_BORDER = this.features.append("path")
          .datum(topojson.mesh(this.us, this.us.objects.states, function(a, b) { return true; }))
          .attr("class", "state-border")
          .attr("d", this.path);

        if(root.type===6){
            this.DISTRICTS_BORDER = this.features.append("path")
              .datum(topojson.mesh(this.us, this.us.objects.districts, function(){ return true; }))
              .attr("class", "district-border")
              .attr("d", this.path);
        }
        

        this.STATES_LABELS = this.features
          .selectAll("text.stateLabel")
          .data(topojson.feature(this.us, this.us.objects.states).features)
          .enter()
          .append("text")
          .attr("transform", function(d) {
                var c = root.path.centroid(d);
                if(d.properties.APname==="LA") { c[0] -=10; }
                if(d.properties.APname==="NH") { c[0] += 2; c[1] +=10; }
                if(d.properties.APname==="MI") { c[0] += 10; c[1] +=20; }
                if(d.properties.APname==="FL") { c[0] += 10; }
                return "translate(" + c + ")";
            })
          .text(function(d) { if (d.properties.APname !== "DC") { return d.properties.APname; }});

         if(root.type===6){
            this.DISTRICTS_LABELS = this.features.selectAll("text.districtLabel")
              .data(topojson.feature(this.us, this.us.objects.districts).features)
              .enter()
              .append("text")
              .attr("class", function(d) { return "districtLabel " + root.nameById[d.id]; } )
              .attr("transform", function(d) { return "translate(" + root.path.centroid(d) + ")"; })
              .text(function(d) {
                if(root.nameById[d.id]!==undefined){
                    var district = root.nameById[d.id].split("-");
                    if(district[1] === "AL"){
                        district[1] = "";
                    }
                    return district[1];
                }
                return false;
            });
        }

    },


    getColorClass : function(id) {
            var root = PrimaryColors;
            var disabled = "color_disabled";
                    
            if(!root.isLive(id)) { return disabled; }
  
            var rate = parseInt(root.rateById[id],10);
            if(root.rateById[id]==="N/A" || root.rateById[id]==="No"){
                return (root.legend.indexOf("color_gop")!==-1) ? "color_gop"  : disabled;
            }else if(root.rateById[id]==="Open"){
                return (root.legend.indexOf("color_open")!==-1) ? "color_open" : disabled;
            }else if(rate===0){
                return (root.legend.indexOf("color_dem")!==-1) ? "color_dem"  : disabled;
            }else if(rate>=1 && rate<=3){
                return (root.legend.indexOf("color_lvl1")!==-1) ? "color_lvl1" : disabled;
            }else if(rate>=4 && rate<=6){
                return (root.legend.indexOf("color_lvl2")!==-1) ?  "color_lvl2" : disabled;
            }else if(rate>=7 && rate<=8){
                return (root.legend.indexOf("color_lvl3")!==-1) ?  "color_lvl3" : disabled;
            }else if( rate>=9 && rate<=30){
                return (root.legend.indexOf("color_lvl4")!==-1) ? "color_lvl4" : disabled;
            }else{
                return root.colorDisabled;
            }
    },

    restrictMap : function(){
        var root = PrimaryColors;
        root.restricted = true;
        d3.selectAll(".stateLabel").style("display","none");
    },

    startMap : function(error, us, reps, info) {
        var root = PrimaryColors;

        root.resetHidden = $("#description,#open,.pol-Open #tooltip-RISK");
        root.mapInfo = $("#map_info");
        root.politician = new Array(PrimaryColors.mapInfo.find("#politician-0"), PrimaryColors.mapInfo.find("#politician-1"));

        $.each(root.politician,function(i,p){
            p.fullname = p.find(".fullname");
            p.description = p.find(".description");
            p.party = p.find(".party");
            p.img = p.find(".photo img");
            p.ESscore = p.find(".ES .score");
            p.ESbar = p.find(".ES .bar");
            p.ASscore = p.find(".AS .score");
            p.ASbar = p.find(".AS .bar");
            p.PV = p.find(".PV .score");
            p.PS = p.find(".PS");
            p.PSvalue = p.PS.find(".value");
            p.primaried = p.find(".primaried");
        });

        root.us = us;
        reps.forEach(function(d) {
            root.rateById[parseInt(d.id,10)] = d.score;
            root.nameById[parseInt(d.id,10)] = d.area;
        });

        root.info = info;
        var checkboxes = d3.select("#key-box").selectAll("li");
        root.legend = [];
        checkboxes[0].forEach(function(d){
            root.legend.push(d3.select(d).attr("id"));
        });

        console.log("INITIALIZING");
        root.projection = d3.geo.albersUsa()
                          .scale(1200)
                          .translate([root.widthMap / 2, root.heightMap / 2]);
        root.path = d3.geo.path().projection(root.projection);
        root.features = d3.select("#map").append("g").style({"width" : this.widthMap,"height" : this.heightMap,});
        root.tooltip = d3.select("#map_sidebar");
        
        root.cx = root.widthMap/2;
        root.cy = root.heightMap/2;

        root.createMap();

        if(root.initial){
            var current = d3.select("#"+root.initial);
            root.zoomMap(current);
            root.restrictMap();
        }
    },

    startPol : function(error, data) {
        var root = PrimaryColors; 

      
        if(data.length===1)
            $("#error").show();
        
        var plot = d3.select("#plot");

        var margin = {top: 10, right: 80, bottom: 30, left: 50},
            widthPlot = 970 - margin.left - margin.right,
            heightPlot = 500 - margin.top - margin.bottom;

        var svg =   plot.append("svg")
                        .attr("width", widthPlot + margin.left + margin.right)
                        .attr("height", heightPlot + margin.top + margin.bottom)
                        .append("g")
                        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        var color = d3.scale.category10();
        color.domain(d3.keys(data[0]).filter(function(key) { return key !== "TIMESTAMP"; }));

        var parseDate = d3.time.format("%Y%m%d").parse;

        var x = d3.time.scale()
            .range([0, widthPlot]);

        var y = d3.scale.linear()
            .range([heightPlot,0]);

        var xAxis = d3.svg.axis()
                      .scale(x)
                      .orient("bottom")
                      .ticks(d3.time.months, 1);

        var yAxis = d3.svg.axis()
                    .scale(y)
                    .orient("left");

        var line = d3.svg.line()
                    .interpolate("basis")
                    .x(function(d) { return x(d.date); })
                    .y(function(d) { return y(d.score); });

        data.forEach(function(d) {
            d.date = parseDate(d.TIMESTAMP);
        });

        var scores = color.domain().map(function(name) {
            
            var temp = name;
            if(temp.indexOf("-")!==-1){ 
                var split = temp.split("-");
                root.party = split[1];
                temp = split[0];
            }

            return {
                name: temp,
                values: data.map(function(d) {
                    return {date: d.date, score: +d[name]};
                })
            };
        });

        x.domain(d3.extent(data, function(d) { return d.date; }));
        y.domain([-30,100]);

        var score = svg.selectAll(".score")
            .data(scores)
            .enter().append("g")
            .attr("class", "score");

        score.append("path")
            .attr("class", function(d){ return "stroke stroke_"+root.party+ " " +d.name;})
            .attr("d", function(d) { return line(d.values); });

        score.append("text")
            .attr("x", 4)
            .attr("y", 4)
            .datum(function(d) { return {name: d.name, value: d.values[d.values.length - 1]}; })
            .attr("transform", function(d) {  return "translate(" + x(d.value.date) + "," + y(d.value.score) + ")"; })
            .text(function(d){ return d.name; });

        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + heightPlot + ")")
            .call(xAxis);

        svg.append("g")
            .attr("class", "y axis")
            .call(yAxis)
            .append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 6)
            .attr("dy", ".71em")
            .style("text-anchor", "end")
            .text("Score");

    }
};

//JQUERY
$(document).ready(function() {

    $("#key-box li").click(function() {
        var className = $(this).attr("id");
        var p = $("#key-box ."+className+", #map_box ."+className);
        var hat = p.hasClass("color_disabled") ? p.attr("class",className) : p.attr("class",className + " color_disabled");
    });

    $(".zoom").click(function(e) {
        e.preventDefault();
        var zoom = $(this).data("zoom");
        var state = d3.select("#"+zoom);
        PrimaryColors.zoomMap(state);
    });

    $(".scale").click(
      function(){
        var scale = $(this).data("scale");
        PrimaryColors.changeScale(PrimaryColors.scale+scale);
        PrimaryColors.zoomMap();
    });

    $(window).on("resize", function() {
        var d3svg = $(".d3svg");
        var targetWidth = $("#map_box").width();
        var targetHeight = $("#map_sidebar").height() - 80;
        var scaledHeight = targetWidth*(PrimaryColors.heightMap/PrimaryColors.widthMap);
        var height = targetHeight > scaledHeight ? targetHeight : scaledHeight;
        d3svg.attr("width", targetWidth).attr("height",height);
    }).trigger("resize");

});