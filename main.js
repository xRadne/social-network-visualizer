import TeaClass from './Tea.js'
const Tea = new TeaClass();

// STATISTICS 
var stats = new Stats();
stats.showPanel(0);
document.body.appendChild(stats.dom);
stats.begin();

let state = {
  selectedNode: null,
  getNodeColor: getNodeColorByGender,
}

const divElement = document.getElementById("3d-graph");
const passwordContainerElement = document.getElementById('passwordContainer');
const passwordInputElement = document.getElementById('passwordInput');
const passwordButtonElement = document.getElementById('passwordButton');
passwordButtonElement.onclick = onPasswordInput;

// 3D FORCE GRAPH
const configOptions = {
  controlType: 'orbit',
  rendererConfig: { antialias: true, alpha: true }
};
const Graph3D = ForceGraph3D(configOptions)(divElement)
  .enableNodeDrag(true)
  .onNodeHover(node => { divElement.style.cursor = node ? 'pointer' : null })
  .onNodeClick(onNodeClick)
  .linkColor(getLinkColor)
  .linkVisibility(getLinkVisibility)
  .nodeThreeObject(nodeObject)
  .showNavInfo(true)
  .onEngineTick(() => { stats.end(); stats.begin(); })
window.Graph3D = Graph3D

// NETWORKX GRAPH
var GraphX = new jsnx.Graph()
window.GraphX = GraphX

// GRAPHICAL USER INTERFACE
var gui = new dat.GUI();
class GraphSettings {
  constructor() {
    this.pathToData = './data/encryptedFacebookFriendsData.json';
    this.nodeShape = 'sphere';
    this.visibleLinks = false;
  }
}
var f1 = gui.addFolder('General'); f1.open()
var graphSettings = new GraphSettings();
const allDataPaths = ['./data/miserables.json', './data/encryptedFacebookFriendsData.json']
f1.add(graphSettings, 'pathToData', allDataPaths).onFinishChange(load);
f1.add(graphSettings, 'nodeShape', ['image', 'text', 'sphere']).onChange(Graph3D.refresh);
f1.add(graphSettings, 'visibleLinks').onChange(Graph3D.refresh);

var graphStatistics = {
  nodeDegree: () => console.log(GraphX.degree()),
  computeBetweenessCentrality,
}
var f2 = gui.addFolder('Statistics'); f2.open()
f2.add(graphStatistics, 'nodeDegree');
f2.add(graphStatistics, 'computeBetweenessCentrality');

var style = {
  primaryNodeColor: '#bbcc77',
  secondaryNodeColor: '#bb3333',
  linkColor: '#505050'
}
var f3 = gui.addFolder('Styling'); f3.open()
f3.addColor(style, 'primaryNodeColor').onFinishChange(Graph3D.refresh)
f3.addColor(style, 'secondaryNodeColor').onFinishChange(Graph3D.refresh)
f3.addColor(style, 'linkColor').onFinishChange(Graph3D.refresh)

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

const mapFriendsToNodes = data => ({ nodes: data.friends, ...data })

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
    .then(data => {
      let edges = data.links.map(l => { return [l.source, l.target] })
      GraphX.addEdgesFrom(edges)
      return data
    })
    .then(Graph3D.graphData)
}

function isEncrypted(data) {
  return data.readable !== 'true'
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

function onNodeClick(node) {
  selectNode(node)
  console.log(node)
  Graph3D
    .linkVisibility(getLinkVisibility)
    .nodeThreeObject(nodeObject)
}

function getLinkVisibility(link, index) {
  if (state.selectedNode)
    return link.source.id === state.selectedNode.id || link.target.id === state.selectedNode.id
  return graphSettings.visibleLinks
}

function getLinkColor(link) {
  return style.linkColor
}

function getNodeColorBySelection(node) {
  let color = (state.selectedNode && node.id === state.selectedNode.id)
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

function removeNode(node) {
  let { nodes, links } = Graph3D.graphData();
  links = links.filter(l => l.source !== node && l.target !== node); // Remove links attached to node
  nodes.splice(node.id, 1); // Remove node
  nodes.forEach((n, idx) => n.id = idx); // Reset node ids to array index
  Graph3D.graphData({ nodes, links });
}

function selectNode(node) {
  if (state.selectedNode && state.selectedNode.id === node.id) {
    state.selectedNode = null;
  } else {
    state.selectedNode = node;
  }
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

function computeBetweenessCentrality() {
  let nodeBetweennessCentralities = jsnx.toArray(
    jsnx.algorithms.betweennessCentrality(GraphX)
  )
  let maxValue = 0
  nodeBetweennessCentralities.forEach(bc => {
    if (bc[1] > maxValue) maxValue = bc[1]
  })
  function getNodeColorByBetweenessCentrality(node) {
    let value
    try {
      value = nodeBetweennessCentralities.find(bc => node.id == bc[0])[1]
    } catch (error) {
      value = 0
    }
    let normalized = Math.pow(value / maxValue, 1/4);
    let redness = Math.round(255 * normalized);
    return 'rgb(' + redness + ',100,100)'
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
