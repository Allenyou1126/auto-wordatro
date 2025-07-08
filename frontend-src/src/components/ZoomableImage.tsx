import { useEffect, useRef, type JSX } from "react";
import mediumZoom, { type Zoom } from "medium-zoom";
import "../assets/zoom.css";

export function ZoomableImage(props: JSX.IntrinsicElements["img"]) {
	const ref = useRef<HTMLImageElement>(null);
	const zoomRef = useRef<Zoom | null>(null);
	useEffect(() => {
		if (!zoomRef.current) {
			zoomRef.current = mediumZoom({
				background: "rgba(0, 0, 0, 0.3)",
				scrollOffset: 0,
				margin: 16,
			});
		}
		if (ref.current) {
			zoomRef.current.attach(ref.current);
		} else {
			zoomRef.current.detach();
		}
	}, [ref]);
	return <img {...props} ref={ref} />;
}
