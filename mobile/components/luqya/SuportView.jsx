// SupportView.js
import { ScrollView, View } from 'react-native';
import AboutUs from './AboutUs';
import ContactUs from './ContactUs';


export default function SupportView() {
    return (
        <ScrollView showsVerticalScrollIndicator={false}>
            <AboutUs />
            <View className="h-[1px] bg-slate-100 my-6" /> {/* Divider */}
            <ContactUs />
        </ScrollView>
    );
}