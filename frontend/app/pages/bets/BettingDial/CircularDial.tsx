import React, { useEffect, useState } from "react";
import {
    Dimensions,
    Image,
    StatusBar,
    StyleSheet,
    ViewStyle,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
    Extrapolate,
    interpolate,
    interpolateColor,
    runOnJS,
    SharedValue,
    useAnimatedReaction,
    useAnimatedStyle,
    useDerivedValue,
    useSharedValue,
    withSpring,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import tailwind from "twrnc";
import { useHaptic } from "./useHaptics";

function toRad(degrees: number) {
    "worklet";
    return (degrees * Math.PI) / 180;
}

function toDeg(radians: number) {
    "worklet";
    return (radians * 180) / Math.PI;
}

const D = 120;
const R = D / 2;

// For value control (finer increments)
const controlAngle = 5;
// For visual notches (fewer marks)
const notchAngle = 15;

// Calculate notches based on visual angle
const notches = 360 / notchAngle;

const sweeping_angle = controlAngle * 2;
const last_angle = 360 - sweeping_angle / 2;
const start_angle = sweeping_angle / 2;

// The space between the circle and the notches
const distanceFactor = 1.3;

const getStrokePosition = (angleInDegrees: number) => {
    const angleInRadians = toRad(angleInDegrees);
    const x = R * distanceFactor * Math.cos(angleInRadians);
    const y = R * distanceFactor * Math.sin(angleInRadians);
    return { x, y };
};

const getTransform = (tranformAngle: number): ViewStyle => {
    const { x, y } = getStrokePosition(tranformAngle);
    return {
        transform: [
            { translateX: x },
            { translateY: y },
            { rotate: `${tranformAngle}deg` },
        ],
    };
};

type NotchesProps = {
    index: number;
    currentAngle: SharedValue<number>;
};

const Notches = ({ index, currentAngle }: NotchesProps) => {
    const hapticSelection = useHaptic();
    const active = useSharedValue(0);

    useAnimatedReaction(
        () => currentAngle.value,
        (next, _prev) => {
            // Mapping current angle to an index value
            let currentAngleFactor = next / controlAngle;
            // Mapping Notch angle to an index value
            let notchAngleFactor = (index * notchAngle) / controlAngle;
            // Setting the currentAngleFactor && notchAngleFactor to the notches when it is zero
            // It is the 0, 360 degree point in the Knob
            if (currentAngleFactor === 0) {
                currentAngleFactor = 360 / controlAngle;
            }
            if (notchAngleFactor === 0) {
                currentAngleFactor = 360 / controlAngle;
            }
            // Setting the currentAngleFactor && notchAngleFactor to the (notches+(factor)) when it is more than zero
            // It is the (start angle) degree point in the Knob, which is the max point

            if (currentAngleFactor > 0 && currentAngleFactor < start_angle / controlAngle) {
                currentAngleFactor = (360 / controlAngle) + currentAngleFactor;
            }
            if (notchAngleFactor > 0 && notchAngleFactor < start_angle / controlAngle) {
                notchAngleFactor = (360 / controlAngle) + notchAngleFactor;
            }

            if (currentAngleFactor >= notchAngleFactor) {
                if (active.value === 0) {
                    hapticSelection && runOnJS(hapticSelection)();
                }
                active.value = withSpring(1);
            } else {
                if (active.value === 1) {
                    hapticSelection && runOnJS(hapticSelection)();
                }
                active.value = withSpring(0);
            }
        },
    );
    const currentStrokeAngle = index * notchAngle;
    const animatedStyles = useAnimatedStyle(() => {
        return {
            opacity: interpolate(active.value, [0, 1], [0.45, 1]),
            backgroundColor: interpolateColor(
                active.value,
                [0, 1],
                ["rgba(0,0,0,0.51)", "white"],
                "RGB",
            ),
        };
    });
    if (currentStrokeAngle === 0) {
        return null;
    }
    return (
        <Animated.View
            key={index}
            style={[
                tailwind.style("absolute h-1 w-5 rounded-3xl"),
                getTransform(currentStrokeAngle),
                animatedStyles,
            ]}
        />
    );
};

type RadialControlProps = {
    onValueChange: (value: number) => void;
    initialValue?: number;
    maxValue?: number;
};

export const RadialControl = ({
    onValueChange,
    initialValue = 0,
    maxValue = 1000
}: RadialControlProps) => {
    const currentAngle = useSharedValue(start_angle);

    const currentValue = useDerivedValue(() => {
        return Math.round(
            interpolate(
                currentAngle.value,
                [start_angle, last_angle],
                [0, maxValue],
                Extrapolate.CLAMP
            )
        );
    });

    useAnimatedReaction(
        () => currentValue.value,
        (next, prev) => {
            if (next !== prev) {
                runOnJS(onValueChange)(next);
            }
        }
    );
    const gesturePreviousTheta = useSharedValue(0);
    const previousChangedAngle = useSharedValue(0);

    const finalAngleNotReached = useSharedValue(1);

    // const movingForwardGestureReachedLimit = useSharedValue(1);
    // const movingBackwardGestureReachedLimit = useSharedValue(1);

    const findNearestMultiple = (angleValue: number) => {
        "worklet";
        let adjustedAngle = angleValue + controlAngle / 2;
        adjustedAngle = adjustedAngle - (adjustedAngle % controlAngle);
        return adjustedAngle;
    };

    const panGesture = Gesture.Pan()
        .onBegin(event => {
            const { x, y } = event;
            const deltaX = x - R; // The Center Coordinates of the Container is now (R, R)
            const deltaY = y - R; // The Center Coordinates of the Container is now (R, R)
            const angleRadians = Math.atan2(deltaY, deltaX);
            const angleDegrees = toDeg(angleRadians);
            let adjustedAngle = angleDegrees;
            adjustedAngle = adjustedAngle < 0 ? adjustedAngle + 360 : adjustedAngle;
            gesturePreviousTheta.value = findNearestMultiple(adjustedAngle);
        })
        .onChange(event => {
            const { x, y } = event;
            const deltaX = x - R; // The Center Coordinates of the Container is now (R, R)
            const deltaY = y - R; // The Center Coordinates of the Container is now (R, R)
            const angleRadians = Math.atan2(deltaY, deltaX);

            const angleDegrees = toDeg(angleRadians);
            let adjustedAngle = angleDegrees;
            adjustedAngle = adjustedAngle < 0 ? adjustedAngle + 360 : adjustedAngle;

            adjustedAngle = findNearestMultiple(adjustedAngle);
            const angleDiff = adjustedAngle - gesturePreviousTheta.value;

            const nextAngle =
                currentAngle.value + (angleDiff - previousChangedAngle.value);
            const changeAngleFactor =
                Math.abs(angleDiff - previousChangedAngle.value) / controlAngle;

            if (
                changeAngleFactor >= 1 &&
                changeAngleFactor <= 2 &&
                finalAngleNotReached.value
            ) {
                if (nextAngle === 360 || nextAngle === 0) {
                    return;
                }

                if (nextAngle <= last_angle && nextAngle > 0) {
                    currentAngle.value = nextAngle;
                    previousChangedAngle.value = angleDiff;
                }
            } else {
                if (changeAngleFactor === notches - 1) {
                    finalAngleNotReached.value = 0;
                }
                if (changeAngleFactor === 0) {
                    finalAngleNotReached.value = 1;
                }
            }
        })
        .onEnd(() => {
            previousChangedAngle.value = 0;
            finalAngleNotReached.value = 1;
        });

    const indicatorAnimationStyle = useAnimatedStyle(() => {
        const localGetIndicatorPosition = (angleInDegrees: number) => {
            const angleInRadians = (angleInDegrees * Math.PI) / 180;
            const x = R * 0.6 * Math.cos(angleInRadians);
            const y = R * 0.6 * Math.sin(angleInRadians);
            return {
                transform: [
                    { translateX: x },
                    { translateY: y },
                    { rotate: `${angleInDegrees}deg` },
                ],
            };
        };

        return {
            opacity: 0.8,
            backgroundColor: "rgba(0,0,0,0.51)",
            ...localGetIndicatorPosition(currentAngle.value),
        };
    });
    return (
        <SafeAreaView
            style={tailwind.style("flex-0.5 items-center justify-center")}
        >
            <StatusBar barStyle={"dark-content"} />
            <GestureDetector gesture={panGesture}>
                <Animated.View
                    style={[
                        tailwind.style(
                            `h-[${D}px] w-[${D}px] rounded-full bg-white shadow-lg flex justify-center items-center`,
                        ),
                        {
                            transform: [{ rotate: "90deg" }],
                        },
                    ]}
                >
                    <Image
                        source={require("@components/Dial.png")}
                        style={[
                            tailwind.style("absolute h-[200px] w-[200px]"),
                            { transform: [{ rotate: "-90deg" }, { translateY: 35 }] },
                        ]}
                    />
                    <Animated.View
                        style={[
                            tailwind.style(
                                "absolute h-1.5 w-8 bg-[#FFA500] shadow-sm rounded-2xl",
                            ),
                            indicatorAnimationStyle,
                        ]}
                    />
                    {Array(notches)
                        .fill(1)
                        .map((_value, index) => (
                            <Notches
                                key={index}
                                index={index}
                                currentAngle={currentAngle}
                            />
                        ))}
                </Animated.View>
            </GestureDetector>
        </SafeAreaView>
    );
};
