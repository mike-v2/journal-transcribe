import React, { useEffect, useState } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

const SpeechToText = (props) => {
  const [voiceText, setVoiceText] = useState("");

  const {
    transcript,
    finalTranscript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition({
    clearTranscriptOnListen: false
  });

  useEffect(() => {
    let newText = finalTranscript.substring(voiceText.length);
    
    
    setVoiceText(finalTranscript);
    props.updateVoiceText(newText);
  }, [finalTranscript])

  if (!browserSupportsSpeechRecognition) {
    return <span>Use Google Chrome for speech recognition.</span>;
  }

  function handleStartListening(e) {
    e.preventDefault(); //submits form 
    
    SpeechRecognition.startListening({
      continuous: true
    });
  }

  function handleStopListening(e) {
    e.preventDefault(); //submits form 

    SpeechRecognition.stopListening();
  }

  return (
    <div>
      <button onClick={handleStartListening}>Start Mic</button>
      <button onClick={handleStopListening}>Stop Mic</button>
      <span>Microphone: {listening ? 'on' : 'off'}</span>
    </div>
  );
};
export default SpeechToText;