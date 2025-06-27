import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    FlatList,
} from 'react-native';
import { Device } from 'react-native-ble-plx';
import { Buffer } from 'buffer';

interface FilesMainProps {
    device: Device | null;
}

const FilesMain: React.FC<FilesMainProps> = ({ device }) => {
    const TOTAL_LINKCHECKS = 100;

    const [fileLines, setFileLines] = useState<string[]>([]);
    const [progress, setProgress] = useState(0);

    const getFromStick = async () => {
        if (!device) {
            Alert.alert('Erreur', 'Aucun appareil connecté');
            return;
        }

        try {
            const services = await device.services();
            const allChars = await Promise.all(
                services.map(s => device.characteristicsForService(s.uuid))
            );
            const characteristics = allChars.flat();

            const writeChar = characteristics.find(c => c.isWritableWithoutResponse);
            const notifyChar = characteristics.find(c => c.isNotifiable);

            if (!writeChar || !notifyChar) {
                Alert.alert('Erreur', 'Caractéristiques non trouvées');
                return;
            }

            let lines: string[] = [];
            let count = 0;
            let startTime = 0;

            setProgress(0);
            setFileLines([]);

            const subscription = device.monitorCharacteristicForService(
                notifyChar.serviceUUID,
                notifyChar.uuid,
                (error, characteristic) => {
                    if (error || !characteristic?.value) return;

                    const decoded = Buffer.from(characteristic.value, 'base64').toString('utf-8');
                    if (decoded.startsWith('+LINKCHECK:')) {
                        count++;

                        if (count === 1) startTime = Date.now();

                        lines.push(decoded.trim());
                        setFileLines([...lines]); // mise à jour de l’affichage
                        setProgress(Math.round((count / TOTAL_LINKCHECKS) * 100));

                        if (count >= TOTAL_LINKCHECKS) {
                            const elapsed = Date.now() - startTime;
                            subscription.remove();
                            Alert.alert(
                                'Terminé',
                                `${TOTAL_LINKCHECKS} linkchecks reçus ✅\n${Math.floor(elapsed / 1000)}s ${elapsed % 1000}ms`
                            );
                        }
                    }
                }
            );

            await device.writeCharacteristicWithoutResponseForService(
                writeChar.serviceUUID,
                writeChar.uuid,
                Buffer.from('RUN Genlinkcheck\n', 'utf-8').toString('base64')
            );

            Alert.alert('Lancement', `Récupération des fichiers...`);

        } catch (e: any) {
            Alert.alert('Erreur', e.message || 'Échec');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Fichier de linkchecks</Text>
            <TouchableOpacity style={styles.button} onPress={getFromStick}>
                <Text style={styles.buttonText}>Get from stick</Text>
            </TouchableOpacity>

            <Text style={styles.progress}>Progression : {progress}%</Text>

            <FlatList
                data={fileLines}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item }) => <Text style={styles.line}>{item}</Text>}
                style={{ marginTop: 16 }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f7fafd',
        padding: 24,
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
        color: '#007AFF',
    },
    button: {
        backgroundColor: '#007AFF',
        borderRadius: 10,
        paddingVertical: 16,
        paddingHorizontal: 40,
        alignItems: 'center',
        alignSelf: 'center',
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 18,
    },
    progress: {
        textAlign: 'center',
        marginVertical: 16,
        fontSize: 16,
        color: '#333',
    },
    line: {
        paddingVertical: 4,
        fontSize: 14,
        color: '#333',
    },
});

export default FilesMain;
