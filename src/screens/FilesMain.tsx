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
    const [fileLines, setFileLines] = useState<string[]>([]);

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

            const subscription = device.monitorCharacteristicForService(
                notifyChar.serviceUUID,
                notifyChar.uuid,
                (error, characteristic) => {
                    if (error || !characteristic?.value) return;

                    const decoded = Buffer.from(characteristic.value, 'base64').toString('utf-8');
                    if (decoded.trim() === 'EOF') {
                        subscription.remove();
                        Alert.alert('Fichier reçu', `Fichier complet (${lines.length} lignes)`);
                        setFileLines(lines);
                        return;
                    }

                    lines.push(decoded.trim());
                }
            );

            // Envoie la commande pour récupérer le fichier
            await device.writeCharacteristicWithoutResponseForService(
                writeChar.serviceUUID,
                writeChar.uuid,
                Buffer.from('ATC+GetFile\n', 'utf-8').toString('base64')
            );

            Alert.alert('Téléchargement...', 'Récupération du fichier en cours');

        } catch (e: any) {
            Alert.alert('Erreur', e.message || 'Échec');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Fichiers depuis le stick</Text>
            <TouchableOpacity style={styles.button} onPress={getFromStick}>
                <Text style={styles.buttonText}>Get from stick</Text>
            </TouchableOpacity>

            <FlatList
                data={fileLines}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item }) => <Text style={styles.line}>{item}</Text>}
                style={{ marginTop: 20 }}
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
    line: {
        paddingVertical: 4,
        fontSize: 14,
        color: '#333',
    },
});

export default FilesMain;
