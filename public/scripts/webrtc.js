var socket = io();

let mediaConstraints = {
  audio: true,
  video: true
};

let myPeerConnection;
let hasAddTrack = false;

document.getElementById('makeCallButton').addEventListener('click', () => {
  createPeerConnection();

  navigator.mediaDevices.getUserMedia(mediaConstraints).then((localStream) => {
    document.getElementById('localVideo').srcObject = localStream;
    if (hasAddTrack) {
      localStream.getTracks().forEach(track => myPeerConnection.addTrack(track, localStream));
    } else {
      myPeerConnection.addStream(localStream);
    }
  }).catch(handleGetUserMediaError);
});

function handleGetUserMediaError(e) {
  switch (e.name) {
    case "NotFoundError":
      alert("Unable to open your call because no camera and/or microphone were found.");
      break;
    case "Security Error":
    case "PermissionDeniedError":
      alert("You cancelled the call");
      break;
    default:
      alert("Error opening your camera and/or microphone: " + e.message);
      break;
  }

  // closeVideoCall();
}


function createPeerConnection () {
  myPeerConnection = new RTCPeerConnection({
    iceServers: [
      {"urls": "stun:stun.l.google.com:19302"}, 
      {"urls": "turn:user@turn.myserver.com", "username": "qwerty", "credential": "test"}
    ]
  });

  hasAddTrack = (myPeerConnection.addTrack !== undefined);

  myPeerConnection.onicecandidate = handleICECandidateEvent;
  // myPeerConnection.onremovestream = handleRemoveStreamEvent;
  // myPeerConnection.oniceconnectionstatechange = handleICEConnectionStateChangeEvent;
  // myPeerConnection.onicegatheringstatechange = handleICEGatheringStateChangeEvent;
  // myPeerConnection.onsignalingstatechange = handleSignalingStateChangeEvent;
  myPeerConnection.onnegotiationneeded = handleNegotiationNeededEvent;

  if (hasAddTrack) {
    myPeerConnection.ontrack = handleTrackEvent;
  } else {
    myPeerConnection.onaddstream = handleAddStreamEvent;
  }

}

function handleNegotiationNeededEvent() {
  console.log('negotiation');
  myPeerConnection.createOffer().then((offer) => {
    return myPeerConnection.setLocalDescription(offer);
  }).then(() => {
    socket.emit('video-offer', {
      sdp: myPeerConnection.localDescription
    });
  }).catch(reportError);
}

function reportError(e) {
  console.log(e);
}

socket.on('video-offer-res', (msg) => {
  handleVideoOfferMsg(msg);
});

socket.on('video-answer-res', (msg) => {
  handleVideoAnswerMsg(msg);
});

function handleVideoOfferMsg(msg) { 

  let localStream = null;

  createPeerConnection();
  
  let desc = new RTCSessionDescription(msg.sdp);

  myPeerConnection.setRemoteDescription(desc).then(() => {
    return navigator.mediaDevices.getUserMedia(mediaConstraints);
  }).then((stream) => {
    localStream = stream;
    document.getElementById("localVideo").srcObject = localStream;
    if (hasAddTrack) {
      console.log('add track');
      localStream.getTracks().forEach(track => myPeerConnection.addTrack(track, localStream));
    } else {
      console.log('add stream');
      myPeerConnection.addStream(localStream);
    }
  }).then(() => {
    return myPeerConnection.createAnswer();
  }).then((answer) => {
    return myPeerConnection.setLocalDescription(answer);
  }).then(() => {
    socket.emit('video-answer', {
      sdp: myPeerConnection.localDescription
    });
  }).catch(handleGetUserMediaError);

}

function handleVideoAnswerMsg(msg) {
  let desc = new RTCSessionDescription(msg.sdp);
  myPeerConnection.setRemoteDescription(desc).catch(reportError);
}

function handleICECandidateEvent(event) {
  if (event.candidate) {
    socket.emit('new-ice-candidate', {
      candidate: event.candidate
    });
  }
}

socket.on('candidate', (msg) => {
  console.log('candidate');
  let candidate = new RTCIceCandidate(msg.candidate);

  myPeerConnection.addIceCandidate(candidate).catch(reportError);
});

function handleAddStreamEvent(event) {
  document.getElementById("receivedVideo").srcObject = event.stream;
  document.getElementById("hangUpButton").disabled = false;
}

function handleTrackEvent(event) {
  document.getElementById("receivedVideo").srcObject = event.streams[0];
  document.getElementById("hangUpButton").disabled = false;
}