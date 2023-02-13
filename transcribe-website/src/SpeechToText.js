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
    
    console.log(`new text unedited = "${newText}"`);

    //delete all the leading spaces
    newText = newText.replace(/^[\s]+/, '');

    newText = newText.replace(/ *period/g, '.');
    newText = newText.replace(/ *comma/g, ',');
    newText = newText.replace(/ *question mark/g, '?');
    newText = newText.replace(/\s?semicolon/g, ';');
    newText = newText.replace(/ *colon/g, ':');
    newText = newText.replace(/\bhyphen\b/g, '-');
    newText = newText.replace(/\bquote\s?/g, '"');
    newText = newText.replace(/ *unquote\b/g, '"');
    newText = newText.replace(/\s?tab\s?/g, '   ');
    newText = newText.replace(/\bnew line\b/g, '\n');

    //capitalize first letter of sentence
    newText = newText.replace(/\. [a-z]/, function(match) {
      return match.toUpperCase();
    });

    console.log(`new text edited = "${newText}"`);
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