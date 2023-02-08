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
    const newText = finalTranscript.substring(voiceText.length);
    console.log("new text = " + newText);
    setVoiceText(finalTranscript);
    props.updateVoiceText(newText);
  }, [finalTranscript])

  if (!browserSupportsSpeechRecognition) {
    return <span>Use Google Chrome for speech recognition.</span>;
  }

  function handleStartListening(e) {
    SpeechRecognition.startListening({
      continuous: true
    });
  }

  function handleStopListening(e) {
    SpeechRecognition.stopListening();
  }

  return (
    <div>
      <p>Microphone: {listening ? 'on' : 'off'}</p>
      <button onClick={handleStartListening}>Start</button>
      <button onClick={handleStopListening}>Stop</button>
      <button onClick={resetTranscript}>Reset</button>
      <p>{transcript}</p>
    </div>
  );
};
export default SpeechToText;