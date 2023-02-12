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
    
    //if first character is space, delete
    newText = newText.replace(/^[\s\uFEFF\xA0]+/g, '');

    newText = newText.replace(/ *period/g, '.');
    newText = newText.replace(/ *comma/g, ',');
    newText = newText.replace(/ *question mark/g, '?');
    newText = newText.replace(/ *new line/g, '\n');
    newText = newText.replace(/ *semicolon/g, ';');
    newText = newText.replace(/ *hyphen/g, ' -');
    newText = newText.replace(/ *tab/g, "   ");

    //capitalize first letter of sentence
    newText = newText.replace(/\. [a-z]/, function(match) {
      return match.toUpperCase();
    });

    if (newText.endsWith('\n') === false) {
      newText = newText + " ";
    }

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
      <textarea className='transcription-box' rows="4" cols="50" placeholder='Temp Transcription' value={transcript}></textarea>
    </div>
  );
};
export default SpeechToText;