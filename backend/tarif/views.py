from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
 
from .models import Tarif
from .serializers import TarifSerializer
 
 
def get_entreprise(user):
    if user.role != 'entreprise':
        return None
    return getattr(user, 'entreprise_profile', None)
 
 
class TarifListCreateView(APIView):
    permission_classes = [IsAuthenticated]
 
    def get(self, request):
        entreprise = get_entreprise(request.user)
        if not entreprise:
            return Response({'detail': 'Accès refusé'}, status=403)
 
        tarifs = Tarif.objects.filter(entreprise=entreprise)
        return Response(TarifSerializer(tarifs, many=True).data)
 
    def post(self, request):
        entreprise = get_entreprise(request.user)
        if not entreprise:
            return Response({'detail': 'Accès refusé'}, status=403)
 
        serializer = TarifSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(entreprise=entreprise)
            return Response(serializer.data, status=201)
 
        return Response(serializer.errors, status=400)
 
 
class TarifDetailView(APIView):
    permission_classes = [IsAuthenticated]
 
    def delete(self, request, pk):
        entreprise = get_entreprise(request.user)
        tarif = get_object_or_404(Tarif, pk=pk, entreprise=entreprise)
        tarif.delete()
        return Response(status=204)
    def update(self, request, pk=None):
        tarif = self.get_object()
        serializer = TarifSerializer(tarif, data=request.data, partial=True)
    
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
    
        return Response(serializer.errors, status=400)