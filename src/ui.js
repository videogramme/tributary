tributary.ui = {};

//list of old filenames that are broken by the change.
//TODO: decide if want to allow for arbitrary file to be the tributary context, in config somehow?
var mainfiles = ["inlet.js", "sinwaves.js", "squarecircle.js"];


var display, panel_gui, panel, panel_handle, page, header;
tributary.ui.setup = function() {
  //UI calculations, we control the dimensions of our various ui components with JS
  
  //keep track of the screen width and height
  //display is the element where things get rendered into

  tributary.panel = new tributary.PanelView({el: ".tb_panel"});
  tributary.panel.render();


  display = d3.select("#display");
  //panel holds the editors, and other controls
  panel= d3.select(".tb_panel");
  //ui container for panel tabs (config/edit)
  panel_gui = d3.selectAll("div.tb_panel_gui");
  //ui container for file tabs
  panelfile_gui = d3.select(".tb_panelfiles_gui");
  //the ui element for resizing the panel
  panel_handle = d3.select(".tb_panel_handle");
  
  
  page = d3.select("#page");
  header = d3.select("#header");

  tributary.dims = {
    display_percent: 0.70,
    page_width: 0,
    page_height: 0,
    display_width: 0,
    display_height: 0,
    panel_width: 0,
    panel_height: 0,
    panel_gui_width: 0,
    panel_gui_height: 31,
    //panelfiles_gui_height: 31
  };

  //We control the layout of our UI completely with code, otherwise we are forcing CSS
  //to do something it wasn't meant to do, make an application...
  tributary.events.on("resize", function() {
    var min_width = parseInt(panel.style("min-width"), 10);
    tributary.dims.page_width = parseInt(page.style("width"), 10);
    //if the panel width goes below the minimum width, don't resize
    if( tributary.dims.page_width - tributary.dims.page_width * tributary.dims.display_percent < min_width ) {
      return;
    }


    //calculate how big we want our display to be
    tributary.dims.display_width = tributary.dims.page_width * tributary.dims.display_percent;
    tributary.dims.panel_width = tributary.dims.page_width - tributary.dims.display_width;
    tributary.dims.panel_gui_width = tributary.dims.panel_width;

    tributary.dims.page_height = parseInt(page.style("height"), 10);
    tributary.dims.display_height = tributary.dims.page_height - parseInt(header.style("height"),10);
    tributary.dims.panel_height = tributary.dims.display_height - (tributary.dims.panel_gui_height);

    //we adjust the size of the ui with javascript because css sucks
    display.style("width", tributary.dims.display_width + "px");
    panel.style("width", tributary.dims.panel_width + "px");
    panel_gui.style("width", tributary.dims.panel_gui_width + "px");
    panelfile_gui.style("width", tributary.dims.panel_gui_width + "px");


    panel.style("height", tributary.dims.panel_height + "px");
    //update all the inner panels
    panel.selectAll(".panel").style("height", tributary.dims.panel_height + "px");
    panel.selectAll(".CodeMirror").style("height", (tributary.dims.panel_height - tributary.dims.panel_gui_height) + "px");

    display.style("height", tributary.dims.display_height + "px");
    panel_gui.style("height", tributary.dims.panel_gui_height + "px");
    panel_gui.style("margin-top", tributary.dims.panel_gui_height + "px");

    panel_handle.style("right", tributary.dims.panel_width + "px");

    tributary.sw = tributary.dims.display_width;
    tributary.sh = tributary.dims.display_height;

    tributary.events.trigger("execute");
  });
  tributary.events.trigger("resize");

  var ph_drag = d3.behavior.drag()
    .on("drag", function() {
      //modify the display % when dragging
      var dx = d3.event.dx/tributary.dims.page_width;
      if(tributary.dims.display_percent + dx >= 0.0 && tributary.dims.display_percent + dx <= 1) {
        tributary.dims.display_percent += dx;
      } 
     tributary.events.trigger("resize");
    })
  panel_handle.call(ph_drag);


  ////////////////////////////////////////////////////////////////////////
  // Setup the Panel GUI for switching between windows in the panel
  ////////////////////////////////////////////////////////////////////////
  
  var panel_data = ["edit", "config"]; // Add "require" to this array to get array tab
  
  
  var pb_w = 60; //width of each button
  var panel_buttons = panel_gui.selectAll("div.pb")
    .data(panel_data)
    .enter()
    .append("div")
    .classed("pb", true)
    .attr({
      id: function(d) { return d + "_tab"; },
    })
  .on("click", function(d) {
    tributary.events.trigger("show", d);
  })
  .text(function(d) { return d; });
 
  //Logic for tabs
  tributary.events.on("show", function(name) {
    //hide all panel divs
    $(".tb_panel").children(".panel")
      .css("display", "none");

    //show the one we want
    panel.select(".tb_" + name)
      .style("display", "");

    //update the panel_gui ui
    panel_gui.selectAll("div.pb")
      .classed("gui_active", false);
    panel_gui.select(".tb_" + name + "_tab")
      .classed("gui_active", true);
  });
  tributary.events.trigger("show", "edit");
  
  
  // Logic for hiding panel?
  
  $('.tb_hide-panel-button').on("click", function(){
      tributary.events.trigger("hidepanel");
      
      $('#display').addClass("fullscreen")
      $('svg').addClass("fullscreen")
      
      $('#header').addClass("dimheader");
      
  })
  $('#show-codepanel-button').on("click", function(){
      tributary.events.trigger("showpanel");
      $('#display').removeClass("fullscreen");
      $('svg').removeClass("fullscreen")
      
      $('#header').removeClass("dimheader");
  })
  
  tributary.events.on("hidepanel", function(){
      
      $(".tb_panel").hide();
      $(".tb_panel_gui").hide();
      $(".tb_panel_handle").hide();
      $(".tb_panelfiles_gui").hide();

      $('#show-codepanel').show();
      
      //we want to save the panel show/hide in the config
      console.log("in hide panel", tributary.__config__)
      if(tributary.__config__) {
        tributary.__config__.set("hidepanel", true);
      }
  })
  
  tributary.events.on("showpanel", function(){
      
      $(".tb_panel").show();
      $(".tb_panel_gui").show();
      $(".tb_panel_handle").show();
      $(".tb_panelfiles_gui").show();

      $('#show-codepanel').hide();

      if(tributary.__config__) {
        tributary.__config__.set("hidepanel", false);
      }
      
  })

};


////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////
//Assemble the full tributary UI
////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////

tributary.ui.assemble = function(gistid) {
  //tributary.trace = true;
  tributary.trace = false;
  tributary.hint = false;

  if(gistid.length > 0){
    tributary.gist(gistid, _assemble);
  } else {
    var ret = {};
    ret.config = new tributary.Config();
    ret.models = new tributary.CodeModels(new tributary.CodeModel());
    _assemble(ret);
  }

};

//callback function to handle response from gist unpacking
function _assemble(ret) {
  var config = ret.config;

  config.contexts = [];
  var context;
  var edel;
  var editor;
  var type;

  //endpoint is for backwards compatibility with preset tributary
  //configurations
  var endpoint = config.get("endpoint");
  if(tributary.endpoint) {
    endpoint = tributary.endpoint;
  }

  if(endpoint === "delta") {
    config.set("display", "svg");
    config.set("play", true);
    config.set("loop", true);
    config.set("autoinit", true);

  } else if (endpoint === "cypress") {
    config.set("display", "canvas");
    config.set("play", true);
    config.set("autoinit", true);

  } else if (endpoint === "hourglass") {
    config.set("display", "svg");
    config.set("play", true);
    config.set("autoinit", true);

  } else if (endpoint === "curiosity") {
    config.set("display", "webgl");
    config.set("play", true);
    config.set("autoinit", true);
    
  } else if (endpoint === "bigfish") {
    config.set("display", "svg");
    config.set("play", true);
    config.set("autoinit", false);
    config.set("restart", true);
    
  } else if (endpoint === "fly") {
    config.set("display", "canvas");
    config.set("play", true);
    config.set("autoinit", false);
    config.set("restart", true);

  } else if (endpoint === "ocean") {
    config.set("display", "div");

  }

  if(!config.get("display")) {
    config.set("display", "svg");
  }

  //endpoint is for backwards compatibility
  //we shouldn't save it from now on
  config.set("endpoint", "");
  
  var edit = panel.select(".tb_edit");
  tributary.edit = edit;

  ret.models.each(function(m) {
    type = m.get("type");

    //console.log(m, type)
    //if(["md", "svg"].indexOf(type) < 0) {
    //}

    //select appropriate html ui containers
    // and create contexts
    // TODO: if name === "inlet.js" otherwise we do a JSContext for .js

    context = tributary.make_context({
      config: config,
      model: m,
      display: display
    });
    if(context) {
      config.contexts.push(context);
      context.render();
      if(mainfiles.indexOf(m.get("filename")) < 0) {
        context.execute();
      }

      context.editor = tributary.make_editor({model: m, parent:edit});
      m.trigger("hide");
    }
  });

  //when done, need to execute code (because json/csv etc need to load first)
  config.contexts.forEach(function(c) {
    //select appropriate html ui containers
    // and create contexts
    if(mainfiles.indexOf(c.model.get("filename")) >= 0) {
      c.model.trigger("show");
      //first load should auto init
      tributary.autoinit = true;
      c.execute();
      tributary.autoinit = config.get("autoinit");
    }
  });

  //fill in the config view
  var config_view = new tributary.ConfigView({
    el: ".tb_config",
    model: config,
  });
  config_view.render();

  //fill in the file view
  var files_view = new tributary.FilesView({
    el: ".tb_files",
    model: config,
  });
  files_view.render();

  //fill in the control view (Config pane)
  var controls_view = new tributary.ControlsView({
    el: ".tb_controls",
    model: config,
  });
  controls_view.render();

  setup_header(ret);


  //save tab state
  tributary.events.trigger("show", config.get("tab"));
  tributary.events.on("show", function(name) {
    config.set("tab", name);
  });

  tributary.dims.display_percent = config.get("display_percent");
  tributary.events.trigger("resize");
  tributary.events.on("resize", function() {
    config.set("display_percent", tributary.dims.display_percent);
  });

  if(config.get("hidepanel")) {
    tributary.events.trigger("hidepanel")
  } else {
    tributary.events.trigger("showpanel");
  }
  tributary.__config__ = config;
} 

function setup_header(ret){

  setup_save(ret.config);

  if(ret.user) {
    var gist_uid = ret.user.id;


    /* TODO: setup editing of description as well as a save button */
    if(gist_uid === tributary.userid) {
        //make editable description
        var info_string = '<input id="gist-title" value="' + ret.gist.description + '" > by <!-- ya boy -->';
    }
    else {
        //make the description and attribution
        var info_string = '"<span id="gist-title-static"><a href="' + ret.gist.html_url + '">' + ret.gist.description + '</a></span>" by ';        
    }
        


    if(ret.user.url === "") {
      info_string += ret.user.login;
    } else {
      info_string += '<a href="' + ret.user.url + '">' + ret.user.login + '</a>';
    }    
    
    $('#gist_info').html(info_string);

    if(ret.user.id !== tributary.userid) {
      console.log("hmm")
      //$("#savePanel").attr("disabled", "true");
      //$("#savePanel").attr("class", "off");
      $('#forkPanel').css("display", "none");
      $('#savePanel').attr("id", "forkPanel");
      setup_save(ret.config);
    }
  } else {
    //if the user is not logged in, or no gist disable save
    if(isNaN(tributary.userid) || !ret.gist) {
      //$("#savePanel").attr("disabled", "true");
      //$("#savePanel").attr("class", "off");
      //$("#forkPanel").attr("disabled", "true");
      //$("#forkPanel").attr("class", "minimal_off");
      
      //$('#forkPanel').hide();
      $('#forkPanel').css("display", "none");
      $('#savePanel').attr("id", "forkPanel");
      setup_save(ret.config);
    }
  }
  
  
  $("#gist-title").on("keydown", function(){
      console.log($("#gist-title").val());  
      ret.config.set("description", $("#gist-title").val())
  })  
}

function setup_save(config) {
  //Setup the save panel
  $('#savePanel').off("click");
  $('#savePanel').on('click', function(e) {
    console.log("saving!")
    d3.select("#syncing").style("display", "block");
    tributary.save_gist(config, "save", function(newurl, newgist) {
      d3.select("#syncing").style("display", "none");
      //window.location = newurl;
    });
  });
  $('#forkPanel').off("click");
  $('#forkPanel').on('click', function(e) {
    console.log("forking!")
    d3.select("#syncing").style("display", "block");
    tributary.save_gist(config, "fork", function(newurl, newgist) {
      window.onunload = false;
      window.onbeforeunload = false;
      window.location = newurl;
    });
  });
  //Setup the login button
  $('#loginPanel').on('click', function(e) {
    tributary.login_gist(tributary.loggedin, function(newurl, newgist) {
      window.onunload = false;
      window.onbeforeunload = false;
      window.location = newurl;
    }); 
  });
}

