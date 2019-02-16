import React from 'react';
// import { Subject } from 'rxjs';
import staticBg from '!file-loader!./painting/resources/staticbg.png';

import * as eventBus from 'event-bus/client';
import Blink from './painting/blink.jsx';
import Words from './painting/words.jsx';

// const testEmitter = new Subject();
// window.test = () => testEmitter.next(true);

const Blank = () => null;

const styles = {
	container: {
		position: 'absolute',
		top: 0,
		left: 0,
		width: '100%',
		height: '100%',
		// backgroundImage: `url(${staticBg})`,
		// backgroundSize: 'cover',
	},
	videoEl: {
		minWidth: '100%',
		minHeight: '100%',
		height: 'auto',
		width: 'auto',
		position: 'fixed',
		top: 0,
		left: 0,
	},
};

const effects = [
	'blink',
	'words',
];

class Painting extends React.Component {
	constructor (props) {
		super(props);
		this.hideAnimation = this.hideAnimation.bind(this);
		this.state = {
			animation: Blank,
		};
	}

	doAnimation () {
		if (this.state.animation !== Blank) { return; }
		const effect = effects[Math.floor(Math.random() * effects.length)];
		switch (effect) {
		case 'blink':
			return this.setState({animation: Blink});
		case 'words':
			return this.setState({animation: Words});
		}
	}

	hideAnimation () {
		this.setState({animation: Blank});
	}

	componentWillMount () {
		this._faceDetect$ = eventBus.subscribe('faceDetect.result')
			.subscribe(msg => msg.data.contents && this.doAnimation());
		// testEmitter.subscribe(() => this.doAnimation());

	}

	componentWillUnmount () {
		this._faceDetect$.unsubscribe();
	}

	render () {
		return (
			<div style={styles.container}>
				<link
					href="https://fonts.googleapis.com/css?family=Gloria+Hallelujah|Love+Ya+Like+A+Sister|Permanent+Marker"
					rel="stylesheet"
				/>

				<video
					style={styles.videoEl}
					poster={staticBg}
				/>

				<this.state.animation
					onEnded={this.hideAnimation}
				/>
			</div>
		);
	}
}
export default Painting;