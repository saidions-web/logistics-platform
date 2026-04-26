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
            return Response({'detail': 'Accès réservé aux entreprises.'}, status=403)

        tarifs = Tarif.objects.filter(entreprise=entreprise).order_by('gouvernorat', 'poids_min')
        return Response(TarifSerializer(tarifs, many=True).data)

    def post(self, request):
        entreprise = get_entreprise(request.user)
        if not entreprise:
            return Response({'detail': 'Accès réservé aux entreprises.'}, status=403)

        serializer = TarifSerializer(data=request.data)
        if serializer.is_valid():
            tarif = serializer.save(entreprise=entreprise)
            return Response(TarifSerializer(tarif).data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TarifDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        entreprise = get_entreprise(request.user)
        if not entreprise:
            return Response({'detail': 'Accès réservé aux entreprises.'}, status=403)

        tarif = get_object_or_404(Tarif, pk=pk, entreprise=entreprise)
        serializer = TarifSerializer(tarif, data=request.data, partial=True)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        entreprise = get_entreprise(request.user)
        if not entreprise:
            return Response({'detail': 'Accès réservé aux entreprises.'}, status=403)

        tarif = get_object_or_404(Tarif, pk=pk, entreprise=entreprise)
        tarif.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)