import * as React from 'react';

import eventBus from 'event-bus/client';
const angry = require('!file-loader!./resources/angry.mp4');
const laugh = require('!file-loader!./resources/laugh.mp4');
const sadzombie = require('!file-loader!./resources/sadzombie.mp4');
const surprise = require('!file-loader!./resources/surprise.mp4');

const sources = [
	angry,
	laugh,
	sadzombie,
	surprise,
];

interface IBlinkProps {
    onEnded(): void,
}
class Blink extends React.Component<IBlinkProps> {
    src: string;
	constructor (props: IBlinkProps) {
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