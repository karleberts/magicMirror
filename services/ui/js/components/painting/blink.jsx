import React from 'react';

import * as eventBus from 'event-bus/client';
// import VideoEffect from './videoEffect.jsx';
import angry from '!file-loader!./resources/angry.mp4';
import laugh from '!file-loader!./resources/laugh.mp4';
import sadzombie from '!file-loader!./resources/sadzombie.mp4';
import surprise from '!file-loader!./resources/surprise.mp4';

const sources = [
	angry,
	laugh,
	sadzombie,
	surprise,
];

class Blink extends React.Component {
	constructor (props) {
		super(props);
		this.src = sources[Math.floor(Math.random() * sources.length)];
		// const relSrc = sources[Math.floor(Math.random() * sources.length)];
		// const a = document.createElement('a');
		// a.href = relSrc;
		// this.src = a.href;
	}

	componentDidMount () {
		eventBus.request('uiServer', 'video.play', {src: this.src})
			.subscribe(() => {
				this.props.onEnded();
			});
	}

	render () {
		return null;
	}
}
export default Blink;