import Timer from './Timer.js'
import TeaClass from './Tea.js'
import * as ColorConverions from './ColorConversions.js'
const Tea = new TeaClass();

// STATISTICS 
// var stats = new Stats();
// stats.showPanel(0);
// document.body.appendChild(stats.dom);
// stats.begin();

const state = {
  selectedNodes: new Set(),
  selectedNodeIds: new Set(),
  selectionNeighbours: new Set(),
  getNodeColor: getNodeColorBySelection,
}

const divElement = document.getElementById("3d-graph");
const passwordInputElement = document.getElementById('passwordInput');
const passwordButtonElement = document.getElementById('passwordButton');
passwordButtonElement.onclick = onPasswordInput;
const sidenavElement = document.getElementById("sidenav");

window.addEventListener( 'resize', onWindowResize, false );

const configOptions = {
  controlType: 'orbit',
  rendererConfig: { antialias: true, alpha: true }
};
const Graph3D = ForceGraph3D(configOptions)(divElement)
  .enableNodeDrag(true)
  .onNodeHover(node => { divElement.style.cursor = node ? 'pointer' : null })
  .onNodeClick(onNodeClick)
  .onBackgroundClick(onBackgroundClick)
  .linkColor(getLinkColor)
  .linkVisibility(getLinkVisibility)
  .nodeVisibility(getNodeVisibility)
  .nodeThreeObject(nodeObject)
  .showNavInfo(true)
  // .onEngineTick(() => { stats.end(); stats.begin(); })
window.Graph3D = Graph3D

// NETWORKX GRAPH
var GraphX = new jsnx.Graph()
window.GraphX = GraphX

// PATHS TO DATA
const allDataPaths = [
  './data/miserables.json',
  './data/encryptedFacebookFriendsData.json', 
]

// GRAPHICAL USER INTERFACE
var gui = new dat.GUI();
class GraphSettings {
  constructor() {
    this.pathToData = allDataPaths[0];
    this.nodeShape = 'sphere';
    this.addSelf = false;
  }
}
var f1 = gui.addFolder('General'); f1.open()
var graphSettings = new GraphSettings();
gui.remember(graphSettings)

f1.add(graphSettings, 'pathToData', allDataPaths).onFinishChange(reload);
f1.add(graphSettings, 'nodeShape', ['image', 'text', 'sphere']).onChange(Graph3D.refresh);
f1.add(graphSettings, 'addSelf').onChange(reload);

var graphStatistics = {
  computeNodeDegree,
  computeBetweenessCentrality,
}
var f2 = gui.addFolder('Statistics'); f2.open()
f2.add(graphStatistics, 'computeNodeDegree');
f2.add(graphStatistics, 'computeBetweenessCentrality');

var style = {
  visibleLinks: false,
  hideSelectionNonNeighbours: true,
  primaryNodeColor: '#ccff00',
  secondaryNodeColor: '#ff0000',
  linkColor: '#505050'
}
var f3 = gui.addFolder('Styling'); f3.open()
f3.addColor(style, 'primaryNodeColor').onFinishChange(Graph3D.refresh).listen()
f3.addColor(style, 'secondaryNodeColor').onFinishChange(Graph3D.refresh).listen()
f3.addColor(style, 'linkColor').onFinishChange(Graph3D.refresh).listen()
f3.add(style, 'visibleLinks').onChange(Graph3D.refresh);
f3.add(style, 'hideSelectionNonNeighbours').onChange(Graph3D.refresh);

// ENCRYPTION
const fieldToUseAsSalt = 'id'
const fieldsToDecrypt = [
  'userId',
  'name',
  'userName',
  'imageUrl',
  'imageUri',
  'gender',
  'source',
  'target',
]

// LOAD DATA FOR INITIAL VIZUALIZATION
load(graphSettings.pathToData)

let angle = 0
let timer = new Timer()
let updateFunction = deltaTime => {
  angle += deltaTime / 10
  let distance = 1500
  Graph3D.cameraPosition({
    x: distance * Math.sin(angle),
    z: distance * Math.cos(angle)
  });
}
timer.update = deltaTime => { }
timer.start()
let animationSettings = {
  rotate: false
}
f1.add(animationSettings, 'rotate').onChange(rotate => timer.update = rotate ? updateFunction : d => { });

const mapFriendsToNodes = data => ({ nodes: data.friends, ...data })

function reload() {
  deselectAll();
  updateSideBar();
  return load(graphSettings.pathToData)
}

function addSelf(data) {
  let myNode = {
    id: data.userId,
    name: data.name,
    userName: data.userName,
    imageUrl: data.imageUrl,
    imageUri: data.imageUri
  }
  state.selectedNodeIds = new Set([ myNode.id ])
  data.nodes = [myNode, ...data.nodes]
  let myConnections = data.friends.map(f => ({ source: myNode.id, target: f.id }))
  data.links = [...myConnections, ...data.links]
  return data
}

function load(path) {
  return fetch(path)
    .then(response => response.json())
    .then(data => {
      if (isEncrypted(data)) {
        const { decrypted, success } = tryDecryptData(data)
        if (success) {
          const passwordContainer = document.getElementById('passwordContainer')
          passwordContainer.style.visibility = 'hidden'
          return decrypted
        }
        else {
          alert('Data is encrypted')
          const passwordContainer = document.getElementById('passwordContainer')
          passwordContainer.style.visibility = 'visible'
        }
      }
      return data
    })
    .then(data => {
      if (data.nodes && data.links) return data
      if (data.friends && data.links) return mapFriendsToNodes(data)
      return { nodes: [], links: [] }
    })
    .then(data => { if (graphSettings.addSelf) addSelf(data); return data })
    .then(data => {
      let edges = data.links.map(l => { return [l.source, l.target] })
      GraphX.addEdgesFrom(edges)
      return data
    })
    .then(Graph3D.graphData)
    .catch(console.error)
}

function isEncrypted(data) {
  return data.readable && data.readable !== 'true'
}

function tryDecryptData(encryptedData) {
  let passphrase = getPassphrase()
  let decrypted = decryptNetworkData(encryptedData, passphrase)

  return { decrypted, success: !isEncrypted(decrypted) }
}

function getPassphrase() {
  return passwordInputElement.value
}

function onPasswordInput() {
  load(graphSettings.pathToData)
}

function onNodeClick(node, event) {
  selectNode(node, event.ctrlKey || event.shiftKey)
  updateSideBar();
  Graph3D
    .linkVisibility(getLinkVisibility)
    .nodeThreeObject(nodeObject)
}

function onBackgroundClick(event) {
  deselectAll();
  updateSideBar();
  Graph3D
    .linkVisibility(getLinkVisibility)
    .nodeThreeObject(nodeObject)
}

function onWindowResize(){
  Graph3D.renderer().setSize( window.innerWidth, window.innerHeight );
  Graph3D.width(window.innerWidth);
  Graph3D.height(window.innerHeight);
}

function getLinkVisibility(link, index) {
  if (state.selectedNodeIds.size !== 0)
    return state.selectedNodeIds.has(link.source.id) || state.selectedNodeIds.has(link.target.id);
  return style.visibleLinks;
}

function getNodeVisibility(node, index) {
  if (state.selectedNodeIds.size !== 0 && style.hideSelectionNonNeighbours) {
    return state.selectionNeighbours.has(node.id) || state.selectedNodeIds.has(node.id);
  } else {
    return true;
  }
}

function getLinkColor(link) {
  return style.linkColor
}

function getNodeColorBySelection(node) {
  let color = (state.selectedNodeIds.size !== 0 && state.selectedNodeIds.has(node.id))
    ? style.secondaryNodeColor
    : style.primaryNodeColor;
  return color
}

function getNodeColorByGender(node) {
  let color = (node.gender == "f")
    ? style.secondaryNodeColor
    : style.primaryNodeColor;
  return color
}

function getConnectedNodes(node) {
  let { nodes, links } = Graph3D.graphData();

  let connectedNodeIds = new Set();
  links.filter(l => node.id === l.source.id || node.id === l.target.id)
  .forEach(l => {
    connectedNodeIds.add(l.source.id); 
    connectedNodeIds.add(l.target.id); 
  });
  return nodes.filter(n => connectedNodeIds.has(n.id));
}

function removeNode(node) {
  let { nodes, links } = Graph3D.graphData();
  links = links.filter(l => l.source !== node && l.target !== node); // Remove links attached to node
  nodes.splice(node.id, 1); // Remove node
  nodes.forEach((n, idx) => n.id = idx); // Reset node ids to array index
  Graph3D.graphData({ nodes, links });
}

function deselectAll() {
  state.selectedNodes = new Set();
  state.selectedNodeIds = new Set();
}

function selectNodes(nodes, keepselected=false) {
  if (!keepselected) 
    deselectAll();
  nodes.forEach(node => selectNode(node, multiselect=true))
}

function selectNode(node, multiselect=false) {
  if (multiselect) {
    if (state.selectedNodeIds.has(node.id)) {
      state.selectedNodes.delete(node);
      state.selectedNodeIds.delete(node.id);
    }
    else {
      state.selectedNodes.add(node);
      state.selectedNodeIds.add(node.id);
    }
  } else {
    if (state.selectedNodeIds.has(node.id)) {
      deselectAll();
    }
    else {
      deselectAll();
      state.selectedNodes.add(node);
      state.selectedNodeIds.add(node.id);
    }
  }
  
  console.log("Selected", node)

  updateSelectionNeighbours();
}

function updateSelectionNeighbours() {
  let { links } = Graph3D.graphData();
  let { selectedNodeIds: selectedNodes } = state;
  state.selectionNeighbours = new Set();
  if (selectedNodes.size === 0) return;

  links.filter(l => selectedNodes.has(l.source.id) || selectedNodes.has(l.target.id))
  .forEach(l => {
    state.selectionNeighbours.add(l.source.id);
    state.selectionNeighbours.add(l.target.id);
  });
}

function updateSideBar() {
  sidenavElement.style.visibility = state.selectedNodeIds.size > 0 ? "visible" : "hidden";

  const selectedPersonElement = document.createElement("div");
  sidenavElement.insertBefore(selectedPersonElement, sidenavElement.firstChild);

  sidenavElement.innerHTML = [...state.selectedNodes].map(node => {
    const connectedNodes = getConnectedNodes(node);
    return `<div class="selectedPerson">
    <h2 class="selectedPerson">${node.name || node.id}</h2>
    <p class="selectedPersonId">Id: ${node.id}</p>
    <h3 class="selectedPersonFriendsTitle">Common friends (${connectedNodes.length})</h3>
    <ul class="selectedPersonFriends">
      ${connectedNodes.map(n => "<li>"+(n.name || n.id)+"</li>").join("")}
    </ul>
  </div>`
  }).join("");
}

function nodeObject(node) {
  switch (graphSettings.nodeShape) {
    case 'image': return createImageObject(node)
    case 'text': return createTextObject(node)
    default: return createSphereObject(node)
  }
}

function createSphereObject(node) {
  let color = state.getNodeColor(node)

  return new THREE.Mesh(
    new THREE.SphereGeometry(7),
    new THREE.MeshLambertMaterial({
      color,
      transparent: true,
      opacity: 0.75
    })
  );
}

function createImageObject({ imageUri, imageUrl }) {
  // use a sphere as a drag handle
  const obj = new THREE.Mesh(
    new THREE.SphereGeometry(7),
    new THREE.MeshBasicMaterial({ depthWrite: false, transparent: true, opacity: 0 })
  );
  // add img sprite as child
  let imgTexture =
    (imageUri) ? new THREE.TextureLoader().load(imageUri) :
      (imageUrl) ? new THREE.TextureLoader().load(imageUrl) :
        null;

  const material = new THREE.SpriteMaterial({ map: imgTexture });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(12, 12);
  obj.add(sprite);
  return obj;
}

function createTextObject(node) {
  // use a sphere as a drag handle
  const obj = new THREE.Mesh(
    new THREE.SphereGeometry(10),
    new THREE.MeshBasicMaterial({ depthWrite: false, transparent: true, opacity: 0 })
  );
  // add text sprite as child
  let sprite = (node.name) ? new SpriteText(node.name) : new SpriteText(node.id);
  sprite.textHeight = 8;
  obj.add(sprite);
  return obj;
}

function removeUnconnectedNodes(graphData) {
  graphData.nodes = graphData.nodes.filter(node => hasLinks(node.id, graphData.links))
  return graphData;
}

function hasLinks(nodeId, links) {
  for (var i = 0; i < links.length; i++) {
    if (links[i].source.id === nodeId || links[i].target.id === nodeId) {
      return true;
    }
  }
  return false;
}

function computeNodeDegree() {
  const degreesArray = jsnx.toArray(GraphX.degree())
  let degrees = {}
  degreesArray.forEach((pair, i) => degrees[pair[0]] = pair[1])

  let maxDegree = 0
  degreesArray.forEach(d => {
    if (d[1] > maxDegree) maxDegree = d[1]
  })

  style.primaryNodeColor = '#00d0ff'
  style.secondaryNodeColor = '#ff0000'
  function getNodeColorByDegree(node) {
    let normalized = degrees[node.id] / maxDegree
    return ColorConverions.interpolateHex(normalized, style.primaryNodeColor, style.secondaryNodeColor)
  }
  state.getNodeColor = getNodeColorByDegree
  Graph3D.nodeThreeObject(nodeObject)
}

function computeBetweenessCentrality() {
  let nodeBetweennessCentralities = jsnx.toArray(
    jsnx.algorithms.betweennessCentrality(GraphX)
  )
  let maxValue = 0
  nodeBetweennessCentralities.forEach(bc => {
    if (bc[1] > maxValue) maxValue = bc[1]
  })
  style.primaryNodeColor = '#00d0ff'
  style.secondaryNodeColor = '#ff0000'
  function getNodeColorByBetweenessCentrality(node) {
    let value
    try {
      value = nodeBetweennessCentralities.find(bc => node.id == bc[0])[1]
    } catch (error) {
      value = 0
    }
    let normalized = Math.pow(value / maxValue, 1 / 4);
    return ColorConverions.interpolateHex(normalized, style.primaryNodeColor, style.secondaryNodeColor)
  }
  state.getNodeColor = getNodeColorByBetweenessCentrality
  // Update all nodes
  Graph3D.nodeThreeObject(nodeObject)
}

function decryptNetworkData(encryptedData, passphrase) {
  let decrypted = decryptFields(encryptedData, fieldsToDecrypt, passphrase)

  if (!encryptedData.friends) return decrypted
  decrypted.friends = []
  encryptedData.friends.forEach((friend, i) => {
    let decryptedFriend = {}
    let salt = friend[fieldToUseAsSalt]
    let saltedpassphrase = salt.slice(0, 2) + passphrase.slice(0, 14)
    decryptedFriend = decryptFields(friend, fieldsToDecrypt, saltedpassphrase)
    decryptedFriend[fieldToUseAsSalt] = Tea.decrypt(salt, passphrase)
    decrypted.friends[i] = decryptedFriend
  })

  if (!encryptedData.links) return decrypted
  decrypted.links = []
  encryptedData.links.forEach((link, i) => {
    decrypted.links[i] = decryptFields(link, fieldsToDecrypt, passphrase)
  })

  if (!encryptedData.readable) return decrypted
  decrypted.readable = Tea.decrypt(encryptedData.readable, passphrase)

  return decrypted
}

function decryptFields(encryptedData, fields, key) {
  let decryptedData = {}
  for (let field of fields) {
    if (encryptedData[field]) {
      decryptedData[field] = Tea.decrypt(encryptedData[field], key)
    }
  }
  return decryptedData
}
