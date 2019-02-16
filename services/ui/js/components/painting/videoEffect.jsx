import React from 'react';
import R from 'ramda';

const styles = {
	container: {
		position: 'absolute',
		top: 0,
		left: 0,
		width: '100%',
		height: '100vh',
		opacity: 0,
		transition: 'opacity 0.2s',
	},
	videoEl: {
		minWidth: '100%',
		minHeight: '100%',
		height: 'auto',
		width: 'auto',
		position: 'absolute',
	},
	overlay: {
		position: 'absolute',
		top: 0,
		left: 0,
		width: '100%',
		height: '100%',
		backgroundColor: '#000',
		opacity: 0.1,
		zIndex: 1,
	},
};

class VideoEffect extends React.Component {
	constructor (props) {
		super(props);
		this.show = this.show.bind(this);
		this.onEnded = this.onEnded.bind(this);
		this.videoRef = c => this.videoEl = c;
		this.state = {
			styles,
		};
	}
	show () {
		this.setState({
			styles: R.merge(styles, {
				container: R.merge(styles.container, {
					opacity: 1,
				}),
			}),
		}, () => this.videoEl.play());
	}
	onEnded () {
		this.setState({
			styles: R.merge(styles, {
				container: R.merge(styles.container, {
					opacity: 0,
				}),
			}),
		}, () => {
			window.setTimeout(this.props.onEnded, 200);
		});
	}
	render () {
		const { styles } = this.state;
		return (
			<div style={styles.container}>
				<video
					onCanPlayThrough={this.show}
					onEnded={this.onEnded}
					preload="auto"
					ref={this.videoRef}
					src={this.props.src}
					style={styles.videoEl}
				/>
				<div
					style={styles.overlay}
				/>
			</div>
		);
	}
}
export default VideoEffect;